package me.sectiontn.inkpad

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class BackgroundLoaderTest {
  @Test
  fun sortsUrisByHowTheyLoad() {
    assertEquals(SourceKind.HTTP, BackgroundLoader.kindOf("http://10.0.2.2:8081/assets/paper.png"))
    assertEquals(SourceKind.HTTP, BackgroundLoader.kindOf("https://example.com/a.png"))
    assertEquals(SourceKind.FILE, BackgroundLoader.kindOf("file:///sdcard/a.png"))
    assertEquals(SourceKind.ASSET, BackgroundLoader.kindOf("file:///android_asset/a.png"))
    assertEquals(SourceKind.ASSET, BackgroundLoader.kindOf("asset:/a.png"))
    assertEquals(SourceKind.DATA, BackgroundLoader.kindOf("data:image/png;base64,AA=="))
    assertEquals(SourceKind.CONTENT, BackgroundLoader.kindOf("content://media/external/images/1"))
    assertEquals(SourceKind.CONTENT, BackgroundLoader.kindOf("android.resource://me.sectiontn/1"))
    assertEquals(SourceKind.RESOURCE, BackgroundLoader.kindOf("src_paper"))
  }

  @Test
  fun rejectsUrisItCannotLoad() {
    assertNull(BackgroundLoader.kindOf("ftp://example.com/a.png"))
    assertNull(BackgroundLoader.kindOf(""))
  }

  @Test
  fun samplesLargeImagesDownToTheLimit() {
    assertEquals(1, BackgroundLoader.sampleSize(4096, 3000))
    assertEquals(2, BackgroundLoader.sampleSize(4097, 3000))
    assertEquals(4, BackgroundLoader.sampleSize(12000, 9000))
    assertEquals(1, BackgroundLoader.sampleSize(0, 0))
  }
}
