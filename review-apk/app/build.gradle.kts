plugins { id("com.android.application") }
val pocketVersion = providers.gradleProperty("pocketVersion").orElse("v.0.01.004-local").get()
android {
    namespace = "com.merzkava.pocket.review"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.merzkava.pocket"
        minSdk = 23
        targetSdk = 34
        versionCode = 1004
        versionName = pocketVersion
    }
    buildTypes {
        debug { }
        release { isMinifyEnabled = false }
    }
    sourceSets {
        getByName("main") { assets.setSrcDirs(listOf("../dist")) }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
