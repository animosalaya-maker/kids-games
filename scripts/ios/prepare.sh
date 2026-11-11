#!/usr/bin/env bash
# Prepares the Capacitor iOS project of Bobo Land (CI, macOS): name, iPhone only, portrait, manual App Store signing
# for the App target (profile from scripts/ios/ios-signing.py), version numbers and the app icon.
# Usage: scripts/ios/prepare.sh <iosAppDir>   Env: TEAM, BUNDLE, PROFILE_NAME, BUILD_NUMBER, APP_VERSION
set -euo pipefail
: "${PROFILE_NAME:?run scripts/ios/ios-signing.py create first}"
IOS="$1"
PL="$IOS/App/Info.plist"
PB=/usr/libexec/PlistBuddy
setp() {
  $PB -c "Delete :$1" "$PL" >/dev/null 2>&1 || true
  if [ $# -lt 3 ]; then $PB -c "Add :$1 $2" "$PL"
  elif [ "$2" = string ]; then $PB -c "Add :$1 $2 \"$3\"" "$PL"
  else $PB -c "Add :$1 $2 $3" "$PL"; fi
}
setp CFBundleDisplayName string "Bobo Land"
setp CFBundleName string "Bobo Land"
setp ITSAppUsesNonExemptEncryption bool false
setp UIRequiresFullScreen bool true
setp UIStatusBarHidden bool false
setp UISupportedInterfaceOrientations array
$PB -c "Add :UISupportedInterfaceOrientations:0 string UIInterfaceOrientationPortrait" "$PL"
$PB -c "Delete :UISupportedInterfaceOrientations~ipad" "$PL" >/dev/null 2>&1 || true
plutil -lint "$PL"

PBX="$IOS/App.xcodeproj/project.pbxproj"
# Drop Xcode's automatic signing lines, then add manual App Store signing next to the app bundle id.
perl -ni -e 'print unless /^\s*(CODE_SIGN_STYLE|DEVELOPMENT_TEAM|PROVISIONING_PROFILE_SPECIFIER|"?CODE_SIGN_IDENTITY(\[sdk=iphoneos\*\])?"?) = /' "$PBX"
B="$BUNDLE" T="$TEAM" PN="$PROFILE_NAME" perl -0pi -e 's/PRODUCT_BUNDLE_IDENTIFIER = \Q$ENV{B}\E;/PRODUCT_BUNDLE_IDENTIFIER = $ENV{B};\n\t\t\t\tCODE_SIGN_STYLE = Manual;\n\t\t\t\tCODE_SIGN_IDENTITY = "Apple Distribution";\n\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "$ENV{PN}";\n\t\t\t\tDEVELOPMENT_TEAM = $ENV{T};/g' "$PBX"
perl -pi -e 's/TARGETED_DEVICE_FAMILY = "1,2";/TARGETED_DEVICE_FAMILY = 1;/g' "$PBX"
V="$APP_VERSION" N="$BUILD_NUMBER" perl -pi -e 's/MARKETING_VERSION = [^;]+;/MARKETING_VERSION = $ENV{V};/g; s/CURRENT_PROJECT_VERSION = [^;]+;/CURRENT_PROJECT_VERSION = $ENV{N};/g' "$PBX"
grep -c "PROVISIONING_PROFILE_SPECIFIER" "$PBX"

# App icon: one 1024×1024 image without transparency (Xcode makes the other sizes).
SET="$IOS/App/Assets.xcassets/AppIcon.appiconset"
rm -f "$SET"/*.png
cp "$(dirname "$0")/icon-1024.png" "$SET/icon-1024.png"
cat > "$SET/Contents.json" <<'JS'
{ "images": [ { "filename": "icon-1024.png", "idiom": "universal", "platform": "ios", "size": "1024x1024" } ],
  "info": { "author": "xcode", "version": 1 } }
JS
echo "iOS project prepared"
