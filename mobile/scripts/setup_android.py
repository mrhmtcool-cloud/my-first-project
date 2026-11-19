#!/usr/bin/env python3
# setup_android.py — runs in CI right after `flutter create . --platforms android`.
# Patches the generated Android project:
#   1. App label → "Labors Near Me"
#   2. Permissions: INTERNET + LOCATION (geolocator) + <queries> for tel:/https: (url_launcher)
#   3. Release signing from android/key.properties when keystore secrets exist,
#      otherwise falls back to debug signing (test builds only).
import io, os, re, base64, sys

APP = os.path.join(os.path.dirname(__file__), '..', 'android', 'app')
MANIFEST = os.path.join(APP, 'src', 'main', 'AndroidManifest.xml')

# ── 1. Manifest: label + permissions + queries ───────────────────────────────
with io.open(MANIFEST, encoding='utf-8') as f:
    m = f.read()

m = re.sub(r'android:label="[^"]*"', 'android:label="Labors Near Me"', m, count=1)

if 'android.permission.INTERNET' not in m:
    m = m.replace('<application',
        '''<uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
    <queries>
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="https" />
        </intent>
        <intent>
            <action android:name="android.intent.action.DIAL" />
            <data android:scheme="tel" />
        </intent>
    </queries>

    <application''', 1)

with io.open(MANIFEST, 'w', encoding='utf-8') as f:
    f.write(m)
print('manifest patched: label + permissions + queries')

# ── 2. Keystore → android/key.properties + android/app/upload-keystore.jks ──
ks_b64 = os.environ.get('KEYSTORE_BASE64', '').strip()
ks_pass = os.environ.get('KEYSTORE_PASSWORD', '').strip()
key_alias = os.environ.get('KEY_ALIAS', 'upload').strip()
key_pass = os.environ.get('KEY_PASSWORD', '').strip()
signed = False

if ks_b64 and ks_pass:
    jks_path = os.path.join(APP, 'upload-keystore.jks')
    with open(jks_path, 'wb') as f:
        f.write(base64.b64decode(ks_b64))
    props = os.path.join(os.path.dirname(APP), 'key.properties')
    with io.open(props, 'w', encoding='utf-8') as f:
        f.write('storePassword=%s\nkeyPassword=%s\nkeyAlias=%s\nstoreFile=upload-keystore.jks\n'
                % (ks_pass, key_pass or ks_pass, key_alias))
    signed = True
    print('keystore written → android/key.properties (release signing ENABLED)')
else:
    print('WARNING: KEYSTORE_BASE64 secret not set — builds will be DEBUG-signed (test only).')
    print('         Run the "Generate Upload Keystore" workflow once to fix this.')

# ── 3. Patch build.gradle (Groovy) or build.gradle.kts (Kotlin DSL) ─────────
def patch_groovy(path):
    with io.open(path, encoding='utf-8') as f:
        s = f.read()
    if 'keystoreProperties' in s:
        return True
    props_block = '''def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

'''
    sign_block = '''    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }
'''
    idx = s.find('android {')
    if idx == -1:
        return False
    s = s[:idx] + props_block + s[idx:]
    idx = s.find('android {')
    end = s.find('\n', idx)
    s = s[:end + 1] + sign_block + s[end + 1:]
    s = s.replace('signingConfig signingConfigs.debug',
                  "signingConfig keystoreProperties['storeFile'] ? signingConfigs.release : signingConfigs.debug")
    with io.open(path, 'w', encoding='utf-8') as f:
        f.write(s)
    return True

def patch_kts(path):
    with io.open(path, encoding='utf-8') as f:
        s = f.read()
    if 'keystoreProperties' in s:
        return True
    imports = '''import java.util.Properties
import java.io.FileInputStream

'''
    props_block = '''val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

'''
    sign_block = '''    signingConfigs {
        create("release") {
            keyAlias = keystoreProperties["keyAlias"] as String?
            keyPassword = keystoreProperties["keyPassword"] as String?
            storeFile = if (keystoreProperties.containsKey("storeFile")) file(keystoreProperties["storeFile"] as String) else null
            storePassword = keystoreProperties["storePassword"] as String?
        }
    }
    lint {
        checkReleaseBuilds = false
        abortOnError = false
    }
'''
    s = imports + s
    idx = s.find('android {')
    if idx == -1:
        return False
    s = s[:idx] + props_block + s[idx:]
    idx = s.find('android {')
    end = s.find('\n', idx)
    s = s[:end + 1] + sign_block + s[end + 1:]
    s = s.replace('signingConfig = signingConfigs.getByName("debug")',
                  'signingConfig = if (keystoreProperties.containsKey("storeFile")) signingConfigs.getByName("release") else signingConfigs.getByName("debug")')
    with io.open(path, 'w', encoding='utf-8') as f:
        f.write(s)
    return True

groovy = os.path.join(APP, 'build.gradle')
kts = os.path.join(APP, 'build.gradle.kts')
if os.path.exists(groovy) and patch_groovy(groovy):
    print('build.gradle patched (Groovy signing config)')
elif os.path.exists(kts) and patch_kts(kts):
    print('build.gradle.kts patched (Kotlin DSL signing config)')
else:
    print('ERROR: no build.gradle(.kts) found in android/app', file=sys.stderr)
    sys.exit(1)

print('setup_android.py done ✅')
