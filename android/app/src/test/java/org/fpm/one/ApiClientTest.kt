package org.fpm.one

import org.fpm.one.core.network.ApiClient
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

class ApiClientTest {

  @Before
  fun setUp() {
    ApiClient.baseUrl = "https://www.fpmglobal.online/api"
  }

  @Test
  fun resolveMediaUrl_nullOrBlank_returnsNull() {
    assertNull(ApiClient.resolveMediaUrl(null))
    assertNull(ApiClient.resolveMediaUrl(""))
    assertNull(ApiClient.resolveMediaUrl("   "))
  }

  @Test
  fun resolveMediaUrl_relativeUploadsPath_prependsServerBase() {
    val result = ApiClient.resolveMediaUrl("/uploads/photos/service1.jpg")
    assertEquals("https://www.fpmglobal.online/uploads/photos/service1.jpg", result)
  }

  @Test
  fun resolveMediaUrl_localhostUploadsPath_rewritesToServerBase() {
    val result = ApiClient.resolveMediaUrl("http://localhost:5000/uploads/avatars/john.png")
    assertEquals("https://www.fpmglobal.online/uploads/avatars/john.png", result)
  }

  @Test
  fun resolveMediaUrl_externalHttpsUrl_retainsUnchanged() {
    val external = "https://images.unsplash.com/photo-sample"
    val result = ApiClient.resolveMediaUrl(external)
    assertEquals(external, result)
  }
}
