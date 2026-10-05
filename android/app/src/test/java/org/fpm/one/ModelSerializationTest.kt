package org.fpm.one

import kotlinx.serialization.json.Json
import org.fpm.one.data.model.BranchItem
import org.fpm.one.data.model.LoginResponse
import org.fpm.one.data.model.UserSession
import org.fpm.one.data.model.WorkerDetails
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class ModelSerializationTest {

  private val json = Json {
    ignoreUnknownKeys = true
    isLenient = true
  }

  @Test
  fun testUserSessionSerialization() {
    val user = UserSession(
      userId = "usr-123",
      email = "sarah@fpmchurch.org",
      phone = "+2348012345678",
      accountStatus = "active",
      isAdmin = false,
      memberId = "mem-456",
      firstName = "Sarah",
      lastName = "Okoro",
      fullName = "Sarah Okoro",
      branchId = "br-789",
      branchName = "Lagos HQ",
      roleId = "rol-101",
      roleName = "Choir Member",
      roleCode = "CHOIR",
      isWorker = true,
      workerDetails = WorkerDetails(
        workerId = "wkr-1",
        workerCode = "FPM-0042",
        departmentId = "dep-1",
        departmentName = "Choir & Music",
        positionName = "Vocalist",
        qrCodeToken = "token-qr-sample"
      )
    )

    val jsonString = json.encodeToString(UserSession.serializer(), user)
    val parsed = json.decodeFromString(UserSession.serializer(), jsonString)

    assertEquals(user.userId, parsed.userId)
    assertEquals(user.fullName, parsed.fullName)
    assertEquals(true, parsed.isWorker)
    assertEquals("FPM-0042", parsed.workerDetails?.workerCode)
  }

  @Test
  fun testLoginResponseDeserialization() {
    val rawJson = """
      {
        "status": "success",
        "token": "jwt-token-sample-value",
        "user": {
          "userId": "usr-1",
          "email": "member@fpm.org",
          "phone": "+234000000",
          "accountStatus": "active",
          "isAdmin": false,
          "memberId": "mem-1",
          "firstName": "John",
          "lastName": "Doe",
          "fullName": "John Doe",
          "branchId": "br-1",
          "branchName": "Ikeja Cathedral",
          "roleId": "rol-1",
          "roleName": "Member",
          "roleCode": "MEMBER",
          "isWorker": false
        }
      }
    """.trimIndent()

    val response = json.decodeFromString(LoginResponse.serializer(), rawJson)
    assertEquals("success", response.status)
    assertEquals("jwt-token-sample-value", response.token)
    assertNotNull(response.user)
    assertEquals("John Doe", response.user?.fullName)
  }

  @Test
  fun testBranchItemDeserialization() {
    val branchJson = """
      {
        "id": "br-hq",
        "name": "FPM Global Headquarters",
        "branchCode": "HQ-01",
        "address": "12 Faith Avenue",
        "city": "Lagos",
        "country": "Nigeria",
        "branchPastorName": "Rev. Dr. Emmanuel"
      }
    """.trimIndent()

    val branch = json.decodeFromString(BranchItem.serializer(), branchJson)
    assertEquals("br-hq", branch.id)
    assertEquals("FPM Global Headquarters", branch.name)
    assertEquals("Nigeria", branch.country)
  }
}
