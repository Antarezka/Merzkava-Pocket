plugins { id("com.android.application") }
val pocketVersion = providers.gradleProperty("pocketVersion").orElse("v.0.01.007-local").get()
val pocketVersionCode = providers.gradleProperty("pocketVersionCode").orElse("1005").get().toInt()
val pocketKeystorePath = System.getenv("POCKET_KEYSTORE_PATH")
val pocketStorePassword = System.getenv("POCKET_STORE_PASSWORD")
val pocketKeyAlias = System.getenv("POCKET_KEY_ALIAS")
val pocketKeyPassword = System.getenv("POCKET_KEY_PASSWORD")
val hasStablePocketSigning = !pocketKeystorePath.isNullOrBlank() &&
    !pocketStorePassword.isNullOrBlank() &&
    !pocketKeyAlias.isNullOrBlank() &&
    !pocketKeyPassword.isNullOrBlank()
android {
    ndkVersion = "27.2.12479018"
    externalNativeBuild {
        cmake {
            path = file("src/main/cpp/CMakeLists.txt")
            version = "3.22.1"
        }
    }
    namespace = "com.merzkava.pocket.review"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.merzkava.pocket"
        minSdk = 23
        targetSdk = 34
        ndk { abiFilters += listOf("arm64-v8a", "armeabi-v7a") }
        externalNativeBuild {
            cmake {
                cppFlags += listOf("-std=c++17", "-fexceptions", "-frtti")
            }
        }
        versionCode = pocketVersionCode
        versionName = pocketVersion
    }
    signingConfigs {
        if (hasStablePocketSigning) {
            create("pocketStable") {
                storeFile = file(pocketKeystorePath!!)
                storePassword = pocketStorePassword
                keyAlias = pocketKeyAlias
                keyPassword = pocketKeyPassword
            }
        }
    }
    buildTypes {
        debug {
            if (hasStablePocketSigning) signingConfig = signingConfigs.getByName("pocketStable")
        }
        release {
            isMinifyEnabled = false
            if (hasStablePocketSigning) signingConfig = signingConfigs.getByName("pocketStable")
        }
    }
    sourceSets {
        getByName("main") { assets.setSrcDirs(listOf("../dist")) }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}


dependencies {
}
