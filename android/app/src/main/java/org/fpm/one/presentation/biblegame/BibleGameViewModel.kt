package org.fpm.one.presentation.biblegame

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import org.fpm.one.data.model.*
import org.fpm.one.data.repository.BibleGameRepository
import java.time.Instant

enum class BibleGameView {
    HOME,
    QUIZ,
    RESULTS,
    PROGRESS,
    LEADERBOARD
}

data class BibleGameState(
    val currentView: BibleGameView = BibleGameView.HOME,
    val isLoading: Boolean = false,
    val isSubmittingAnswer: Boolean = false,
    val isCompletingRound: Boolean = false,
    val isOffline: Boolean = false,
    val errorMessage: String? = null,
    val todayOverview: BibleTodayOverview? = null,
    val session: BibleGameSession? = null,
    val activeQuestion: BibleQuestionView? = null,
    val selectedOptionIndex: Int? = null,
    val isQuestionLocked: Boolean = false,
    val remainingSeconds: Float = 15.0f,
    val isQuestionTimerRunning: Boolean = false,
    val activeTiming: BibleQuestionTiming? = null,
    val lastAnswerFeedback: BibleAnswerFeedback? = null,
    val completionResult: BibleChallengeCompletion? = null,
    val progressHistory: BibleProgressHistory? = null,
    val leaderboard: BibleLeaderboardData? = null,
    val branchFilterId: String? = null
)

class BibleGameViewModel(
    private val repository: BibleGameRepository = BibleGameRepository()
) : ViewModel() {

    private val _state = MutableStateFlow(BibleGameState())
    val state: StateFlow<BibleGameState> = _state.asStateFlow()

    private var timerJob: Job? = null

    init {
        loadTodayOverview()
    }

    override fun onCleared() {
        super.onCleared()
        timerJob?.cancel()
    }

    fun loadTodayOverview() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, errorMessage = null) }
            val result = repository.getTodayOverview()
            result.fold(
                onSuccess = { overview ->
                    _state.update {
                        it.copy(
                            isLoading = false,
                            isOffline = false,
                            todayOverview = overview
                        )
                    }
                },
                onFailure = { err ->
                    _state.update {
                        it.copy(
                            isLoading = false,
                            isOffline = isNetworkException(err),
                            errorMessage = err.message ?: "Failed to load today's Bible Challenge."
                        )
                    }
                }
            )
        }
    }

    fun startChallenge() {
        timerJob?.cancel()
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, errorMessage = null) }
            val result = repository.startOrResumeSession()
            result.fold(
                onSuccess = { session ->
                    if (session.isCompleted) {
                        _state.update {
                            it.copy(
                                isLoading = false,
                                session = session,
                                activeQuestion = null,
                                selectedOptionIndex = null,
                                isQuestionLocked = false,
                                lastAnswerFeedback = null,
                                currentView = BibleGameView.RESULTS
                            )
                        }
                    } else {
                        _state.update {
                            it.copy(
                                isLoading = false,
                                session = session,
                                activeQuestion = session.currentQuestion,
                                selectedOptionIndex = null,
                                isQuestionLocked = false,
                                lastAnswerFeedback = null,
                                currentView = BibleGameView.QUIZ
                            )
                        }
                        val timing = session.activeQuestionTiming
                        if (timing != null) {
                            startQuestionCountdown(timing)
                        } else {
                            val timingRes = repository.startQuestion(session.currentQuestionIndex)
                            timingRes.getOrNull()?.let { startQuestionCountdown(it) }
                        }
                    }
                },
                onFailure = { err ->
                    _state.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = err.message ?: "Failed to start challenge."
                        )
                    }
                }
            )
        }
    }

    fun startQuestionCountdown(timing: BibleQuestionTiming) {
        timerJob?.cancel()
        val limitSeconds = (timing.timeLimitSeconds.takeIf { it > 0 } ?: 15).toFloat()
        val limitMs = (limitSeconds * 1000f).toLong()

        _state.update {
            it.copy(
                activeTiming = timing,
                isQuestionLocked = false,
                isQuestionTimerRunning = true,
                remainingSeconds = limitSeconds
            )
        }

        val deadlineEpoch = try {
            Instant.parse(timing.deadlineAt).toEpochMilli()
        } catch (e: Exception) {
            System.currentTimeMillis() + limitMs
        }
        val serverEpoch = try {
            timing.serverTime?.let { Instant.parse(it).toEpochMilli() } ?: System.currentTimeMillis()
        } catch (e: Exception) {
            System.currentTimeMillis()
        }
        val clockOffset = serverEpoch - System.currentTimeMillis()

        timerJob = viewModelScope.launch {
            while (isActive) {
                val nowServer = System.currentTimeMillis() + clockOffset
                val remainingMs = (deadlineEpoch - nowServer).coerceAtLeast(0L)
                val remainingSec = (remainingMs / 1000f).coerceIn(0f, limitSeconds)

                _state.update {
                    it.copy(
                        remainingSeconds = remainingSec,
                        isQuestionTimerRunning = remainingMs > 0
                    )
                }

                if (remainingMs <= 0L) {
                    handleTimeoutSubmission(timing.questionIndex)
                    break
                }
                delay(50L)
            }
        }
    }

    fun selectOption(index: Int) {
        val currentState = _state.value
        if (currentState.isQuestionLocked || currentState.lastAnswerFeedback != null || currentState.isSubmittingAnswer) {
            return
        }

        // Immediately lock question and cancel local timer
        timerJob?.cancel()
        _state.update {
            it.copy(
                selectedOptionIndex = index,
                isQuestionLocked = true,
                isQuestionTimerRunning = false
            )
        }

        val session = currentState.session ?: return
        val questionIndex = session.currentQuestionIndex

        viewModelScope.launch {
            _state.update { it.copy(isSubmittingAnswer = true, errorMessage = null) }
            val result = repository.submitAnswer(
                questionIndex = questionIndex,
                selectedOptionIndex = index,
                isTimeout = false
            )
            result.fold(
                onSuccess = { feedback ->
                    _state.update {
                        it.copy(
                            isSubmittingAnswer = false,
                            lastAnswerFeedback = feedback
                        )
                    }
                },
                onFailure = { err ->
                    _state.update {
                        it.copy(
                            isSubmittingAnswer = false,
                            errorMessage = err.message ?: "Failed to submit answer. Please try again."
                        )
                    }
                }
            )
        }
    }

    private fun handleTimeoutSubmission(questionIndex: Int) {
        val currentState = _state.value
        if (currentState.lastAnswerFeedback != null || currentState.isSubmittingAnswer) return

        timerJob?.cancel()
        _state.update {
            it.copy(
                isQuestionLocked = true,
                isQuestionTimerRunning = false,
                remainingSeconds = 0.0f,
                isSubmittingAnswer = true
            )
        }

        viewModelScope.launch {
            val result = repository.submitAnswer(
                questionIndex = questionIndex,
                selectedOptionIndex = null,
                isTimeout = true
            )
            result.fold(
                onSuccess = { feedback ->
                    _state.update {
                        it.copy(
                            isSubmittingAnswer = false,
                            lastAnswerFeedback = feedback
                        )
                    }
                },
                onFailure = { err ->
                    _state.update {
                        it.copy(
                            isSubmittingAnswer = false,
                            errorMessage = err.message ?: "Time expired. Could not record response."
                        )
                    }
                }
            )
        }
    }

    fun continueToNextQuestion() {
        val feedback = _state.value.lastAnswerFeedback ?: return
        timerJob?.cancel()
        if (feedback.isRoundFinished) {
            finalizeChallengeRound()
        } else {
            val nextIndex = feedback.currentQuestionIndex
            viewModelScope.launch {
                _state.update { it.copy(isLoading = true, errorMessage = null) }
                val timingResult = repository.startQuestion(nextIndex)
                val sessionResult = repository.startOrResumeSession()

                sessionResult.fold(
                    onSuccess = { session ->
                        val timing = timingResult.getOrNull() ?: session.activeQuestionTiming
                        _state.update {
                            it.copy(
                                isLoading = false,
                                session = session,
                                activeQuestion = session.currentQuestion,
                                selectedOptionIndex = null,
                                isQuestionLocked = false,
                                lastAnswerFeedback = null,
                                currentView = BibleGameView.QUIZ
                            )
                        }
                        if (timing != null) {
                            startQuestionCountdown(timing)
                        }
                    },
                    onFailure = { err ->
                        _state.update {
                            it.copy(
                                isLoading = false,
                                errorMessage = err.message ?: "Failed to load next question."
                            )
                        }
                    }
                )
            }
        }
    }

    private fun finalizeChallengeRound() {
        timerJob?.cancel()
        viewModelScope.launch {
            _state.update { it.copy(isCompletingRound = true, errorMessage = null) }
            val result = repository.completeChallenge()
            result.fold(
                onSuccess = { completion ->
                    _state.update {
                        it.copy(
                            isCompletingRound = false,
                            completionResult = completion,
                            currentView = BibleGameView.RESULTS
                        )
                    }
                    loadTodayOverview()
                },
                onFailure = { err ->
                    _state.update {
                        it.copy(
                            isCompletingRound = false,
                            errorMessage = err.message ?: "Failed to save results. Please check your connection."
                        )
                    }
                }
            )
        }
    }

    fun reviewCompletedChallenge() {
        val overview = _state.value.todayOverview ?: return
        if (overview.isCompleted && overview.reviewedQuestions != null) {
            val syntheticCompletion = BibleChallengeCompletion(
                challengeDate = overview.challengeDate,
                score = overview.score,
                totalQuestions = overview.totalQuestions,
                xpAwarded = 0.0,
                alreadyCompleted = true,
                stats = overview.stats,
                newlyUnlockedBadges = emptyList(),
                reviewedQuestions = overview.reviewedQuestions
            )
            _state.update {
                it.copy(
                    completionResult = syntheticCompletion,
                    currentView = BibleGameView.RESULTS
                )
            }
        }
    }

    fun loadProgressAndAchievements() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, errorMessage = null) }
            val result = repository.getProgressHistory()
            result.fold(
                onSuccess = { progress ->
                    _state.update {
                        it.copy(
                            isLoading = false,
                            progressHistory = progress,
                            currentView = BibleGameView.PROGRESS
                        )
                    }
                },
                onFailure = { err ->
                    _state.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = err.message ?: "Failed to load progress."
                        )
                    }
                }
            )
        }
    }

    fun loadLeaderboard(branchId: String? = null) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, errorMessage = null, branchFilterId = branchId) }
            val result = repository.getLeaderboard(branchId)
            result.fold(
                onSuccess = { lb ->
                    _state.update {
                        it.copy(
                            isLoading = false,
                            leaderboard = lb,
                            currentView = BibleGameView.LEADERBOARD
                        )
                    }
                },
                onFailure = { err ->
                    _state.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = err.message ?: "Failed to load leaderboard."
                        )
                    }
                }
            )
        }
    }

    fun navigateTo(view: BibleGameView) {
        if (view != BibleGameView.QUIZ) {
            timerJob?.cancel()
        }
        _state.update {
            it.copy(
                currentView = view,
                errorMessage = null
            )
        }
        if (view == BibleGameView.HOME) {
            loadTodayOverview()
        } else if (view == BibleGameView.PROGRESS && _state.value.progressHistory == null) {
            loadProgressAndAchievements()
        } else if (view == BibleGameView.LEADERBOARD && _state.value.leaderboard == null) {
            loadLeaderboard()
        }
    }

    fun dismissError() {
        _state.update { it.copy(errorMessage = null) }
    }

    private fun isNetworkException(e: Throwable): Boolean {
        val msg = e.message?.lowercase() ?: ""
        return msg.contains("timeout") || msg.contains("connect") || msg.contains("host") || msg.contains("unreachable")
    }
}
