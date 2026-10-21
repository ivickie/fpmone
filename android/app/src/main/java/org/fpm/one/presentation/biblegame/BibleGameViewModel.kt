package org.fpm.one.presentation.biblegame

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.fpm.one.data.model.*
import org.fpm.one.data.repository.BibleGameRepository

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

    init {
        loadTodayOverview()
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
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, errorMessage = null) }
            val result = repository.startOrResumeSession()
            result.fold(
                onSuccess = { session ->
                    if (session.isCompleted) {
                        // Already completed, review results
                        _state.update {
                            it.copy(
                                isLoading = false,
                                session = session,
                                activeQuestion = null,
                                selectedOptionIndex = null,
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
                                lastAnswerFeedback = null,
                                currentView = BibleGameView.QUIZ
                            )
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

    fun selectOption(index: Int) {
        // Only permit selection if answer has not yet been submitted for this question
        if (_state.value.lastAnswerFeedback == null && !_state.value.isSubmittingAnswer) {
            _state.update { it.copy(selectedOptionIndex = index) }
        }
    }

    fun submitAnswer() {
        val selected = _state.value.selectedOptionIndex ?: return
        val session = _state.value.session ?: return
        if (_state.value.lastAnswerFeedback != null || _state.value.isSubmittingAnswer) return

        viewModelScope.launch {
            _state.update { it.copy(isSubmittingAnswer = true, errorMessage = null) }
            val questionIndex = session.currentQuestionIndex
            val result = repository.submitAnswer(questionIndex, selected)
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

    fun continueToNextQuestion() {
        val feedback = _state.value.lastAnswerFeedback ?: return
        if (feedback.isRoundFinished) {
            // Completed 5/5 questions, finalize round
            finalizeChallengeRound()
        } else {
            // Move to next question by refreshing session
            startChallenge()
        }
    }

    private fun finalizeChallengeRound() {
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
                    // Refresh overview in background
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
                xpAwarded = 0,
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
