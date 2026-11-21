==========================================================
  LUDO - HTML5 GAME (Website + Android / Play Store ready)
  Documentation for buyers
==========================================================

Thank you for your purchase!
This is a complete Ludo board game built with plain HTML, CSS and
JavaScript. No framework, no external images, no MP3 files and no
internet connection needed to play.


----------------------------------------------------------
1. WHAT IS INCLUDED
----------------------------------------------------------
index.html            Main page, menu, setup and game screens
style.css             All design, colours and animations
game.js               Board drawing, rules, dice, bot AI
sound.js              Sound effects made with the Web Audio API + Mute button
ads-config.js         Easy Banner / Popunder ad settings
manifest.webmanifest  Makes the website installable (PWA)
sw.js                 Offline support for the website version
icons/                App icons used by the website
assets/               Source images for the Android app icon and splash screen
store-assets/         Google Play images (512x512 icon, 1024x500 feature graphic)
package.json,
capacitor.config.json,
copy-web.js           Files used to build the Android app (see section 7)
README.txt            This file

GAME FEATURES
- Vs Computer (smart bot), Pass & Play (2, 3 or 4 players) and
  Team Up (2 vs 2: Red + Yellow against Green + Blue)
- A separate dice for every player, placed next to his own corner (like
  the big Ludo apps). On a shared phone everybody taps his own dice and
  only the dice of the player whose turn it is can be used, so nobody can
  roll by accident for someone else
- TEAM UP MODE: partners sit opposite each other and never capture each
  other. A team wins when all 8 tokens of both partners are home. When a
  player has brought all his tokens home, his dice moves his partner's
  tokens. Can be played with 4 people or as "Me + 3 bots" (you and a bot
  partner against two bots).
- Classic rules: roll a 6 to leave the yard, safe star squares,
  capturing rival tokens, extra roll on 6 / capture / reaching home,
  three sixes in a row ends the turn, exact roll needed to finish
- Works on phones, tablets and computers (responsive)
- Smooth token animation and sound effects, Mute / Unmute button


----------------------------------------------------------
2. HOW TO TEST THE GAME ON YOUR COMPUTER
----------------------------------------------------------
Keep all files in the same folder and double-click index.html.
The game opens in your browser and works right away.

(Sound and the offline feature work best when the game is opened
from a web address, which happens automatically after you host it.)


----------------------------------------------------------
3. HOW TO HOST THE GAME ON YOUR WEBSITE
----------------------------------------------------------
Upload the whole game folder (every file and the icons folder) to any
web hosting. Keep the folder structure exactly as it is.

Option A - cPanel / shared hosting
  1. Open File Manager and go to public_html.
  2. Create a folder, for example "ludo".
  3. Upload all files and the "icons" folder into it.
  4. Open  https://yourdomain.com/ludo/

Option B - free static hosts (Netlify, Vercel, GitHub Pages,
          Cloudflare Pages)
  1. Create a new site and upload / drag & drop the game folder.
  2. Open the link the host gives you.

IMPORTANT: use HTTPS. Most ad networks and the offline feature need it.

Placing the game inside a page of your own site (optional):
  <iframe src="https://yourdomain.com/ludo/" width="100%" height="800"
          style="border:0" allowfullscreen></iframe>


----------------------------------------------------------
4. HOW TO CHANGE THE NAME, TEXT AND COLOURS
----------------------------------------------------------
GAME NAME
  Open index.html and change:
    <title>Ludo - Classic Board Game</title>       (browser tab title)
    <h1 class="logo-title">LUDO</h1>                (name on the menu)
    <p class="logo-sub">The classic board game</p>  (small line under it)
  Also change the name in manifest.webmanifest ("name", "short_name").

PLAYER COLOURS AND THEME
  Open style.css. At the very top you will find:
    --red:    #e63946;
    --green:  #30b566;
    --yellow: #fcbf24;
    --blue:   #318cf0;
    --bg-1, --bg-2, --bg-3  (background colours)
  Change the colour codes and save. The board, tokens and buttons all
  follow these values automatically.

DEFAULT PLAYER NAMES
  In game.js, search for DEFAULT_NAMES (and BOT_NAMES for computer
  players) near the top of the file and edit the words.

ICONS
  Replace the PNG files inside the icons/ folder, the assets/ folder and
  store-assets/ with your own artwork. Keep the same file names and sizes.


----------------------------------------------------------
5. HOW TO ADD YOUR OWN ADS (Adsterra / AdSense / others)
----------------------------------------------------------
Everything is controlled from ONE file: ads-config.js.
Open it and edit only the ADS_CONFIG block at the top.

BANNER AD
  1. Copy the banner code from your ad network.
  2. In ads-config.js find the "banner" part.
  3. Set      enabled: true
  4. Paste the code between the two backticks:     code: `PASTE HERE`
  5. Choose the mode:
       mode: 'iframe'  -> Adsterra and most networks (recommended)
       mode: 'inline'  -> Google AdSense
  6. Set width and height to match your banner (728x90 or 320x50 ...).
  7. Optional: put a small banner (for example 320x50) in "mobile" so
     phones get a banner that fits.

POPUNDER AD
  1. Copy the single <script src="..."></script> line from the network.
  2. In the "popunder" part set      enabled: true
  3. Paste it between the backticks of "code".
  4. loadOn decides when it starts:
       'gameStart' (best), 'gameEnd' or 'pageLoad'

TURN ALL ADS OFF
  Set   enabled: false   at the top of ADS_CONFIG, or leave the ad
  type disabled. The empty banner space hides itself automatically.

TIPS
  - Never paste ad code into index.html. Use ads-config.js only.
  - If an ad does not show, check that the site uses HTTPS and that
    your domain is approved in your ad network account.
  - Ads usually do not show when you open the file from your computer
    (file://). Test on your live website.


----------------------------------------------------------
6. SOUND
----------------------------------------------------------
All sounds are created inside the browser, so there is nothing to
download. The speaker button turns sound on or off and remembers the
choice. Browsers start sound only after the first tap or click, which
is normal.


----------------------------------------------------------
7. MAKE AN ANDROID APP FOR GOOGLE PLAY STORE
----------------------------------------------------------
The project is prepared with Capacitor, which wraps the game into a
real Android app. The game files are packed inside the app, so it
works without internet.

WHAT YOU NEED (one time)
  - A computer (Windows, Mac or Linux)
  - Node.js (LTS version)          https://nodejs.org
  - Android Studio                 https://developer.android.com/studio
  - Java 17 (comes with Android Studio)
  - A Google Play Developer account (one-time fee, set by Google)

STEP 1 - Choose your app ID and name
  Open capacitor.config.json and change:
    "appId":   "com.yourcompany.ludo"    <- must be unique, lowercase,
                                            e.g. com.johnsmith.ludogame
    "appName": "Ludo"                    <- name shown under the icon
  The appId can NOT be changed after you publish. Choose carefully.

STEP 2 - Install the tools (inside the game folder)
  Open a terminal / command prompt in the game folder and run:
    npm install

STEP 3 - Create the Android project
    npm run add:android
  This creates an "android" folder.

STEP 4 - Create the app icon and splash screen
    npm run assets
  This uses the pictures in the assets/ folder to make all icon sizes.
  Replace those pictures first if you want your own artwork.

STEP 5 - Copy your latest game files into the app
    npm run sync
  Run this command again every time you change any game file
  (index.html, style.css, game.js, ...).

STEP 6 - Open the project in Android Studio
    npm run open
  Wait until Android Studio finishes "Gradle sync".

STEP 7 - Set version numbers
  In Android Studio open  android/app/build.gradle  and find:
    versionCode 1
    versionName "1.0"
  Increase versionCode by 1 for every update you upload to Google Play.

STEP 8 - Optional: lock the screen to portrait
  Open android/app/src/main/AndroidManifest.xml and add this inside the
  <activity ...> tag:
    android:screenOrientation="portrait"

STEP 9 - Test on a phone
  Connect a phone with USB debugging on (or use an emulator) and press
  the green Run button in Android Studio.

STEP 10 - Build the signed release file (AAB)
  Google Play requires an .aab file.
  1. Android Studio menu:  Build > Generate Signed Bundle / APK
  2. Choose "Android App Bundle" and click Next.
  3. Click "Create new..." to make a keystore (your signing key).
     Choose strong passwords and write them down.
  4. BACK UP THE KEYSTORE FILE AND PASSWORDS IN A SAFE PLACE.
     If you lose them you can never update the app again.
  5. Select "release" and finish. The file is created at
     android/app/release/app-release.aab
  (Google Play App Signing will be offered when you upload.)

The Android back button is already handled: it closes pop-ups, goes
back from the game to the menu, and exits from the main menu.


----------------------------------------------------------
8. PUBLISHING ON GOOGLE PLAY - CHECKLIST
----------------------------------------------------------
1. Create the app in Google Play Console (play.google.com/console).
2. Upload the .aab file to a Production (or Testing) release.
   Note: new personal developer accounts must usually run a closed
   test with a number of testers for some days before production.
   Check the current rule in Play Console.
3. Store listing images (ready in the store-assets folder):
     - App icon .................. play-store-icon-512.png  (512x512)
     - Feature graphic ........... feature-graphic-1024x500.png
     - Phone screenshots ......... take at least 2 from your phone
                                   or emulator (use real game screens)
4. Write the short description (80 characters) and the full description.
   Suggestion for a title:  Ludo - Classic Board Game
5. PRIVACY POLICY: Google requires a public privacy policy web link.
   Create a simple page on your website. If you show ads it must say
   that ad networks may collect data. Free generators are available.
6. Complete the forms in Play Console:
     - App content > Privacy policy
     - Data safety (say whether ads collect data)
     - Ads declaration (Yes if you show ads)
     - Content rating questionnaire (Ludo is a simple board game)
     - Target audience (choose 13+ or all ages carefully - choosing
       children adds strict ad rules)
7. Make sure the app targets the API level Google currently requires.
   Capacitor's current version already follows the requirement. If
   Play Console shows a warning, run:
       npm install @capacitor/core@latest @capacitor/android@latest
       npm install -D @capacitor/cli@latest
   and then   npm run sync   and build again.


----------------------------------------------------------
9. VERY IMPORTANT - ADS INSIDE THE PLAY STORE APP
----------------------------------------------------------
Google Play has strict advertising rules. Please read:

- POPUNDER ads: Google can reject or remove apps that open pop-up
  pages or ads outside the app. For this reason the popunder is turned
  OFF automatically inside the Android app (disableInApp: true in
  ads-config.js). Keep it that way for Play Store builds. Popunders
  are fine on your website.
- GOOGLE ADSENSE: AdSense is for websites only. Its rules do not allow
  AdSense banners inside mobile apps. For the Android app use Google
  AdMob instead, or set  banner disableInApp: true  and keep AdSense for
  the website version.
- OTHER NETWORKS (for example Adsterra banners): check that your
  network allows its ads inside an app and that they follow the Google
  Play ads policy (no misleading, full-screen or disruptive ads). You
  are responsible for the ads you show.
- For the best Play Store result, add AdMob with a Capacitor AdMob
  plugin. That is a separate setup that is not part of this package.

If your app is rejected, read the message from Google, remove the
cause (usually the ads) and upload a new version.


----------------------------------------------------------
10. OTHER WAYS TO PUBLISH ON ANDROID (OPTIONAL)
----------------------------------------------------------
PWA (no app store needed)
  After hosting the game on HTTPS, open it in Chrome on Android. The
  browser offers "Install app" / "Add to Home screen". The manifest and
  sw.js included here make this work, including offline play.

TWA (Trusted Web Activity)
  Another way to put your hosted site on Google Play is Bubblewrap
  (https://github.com/GoogleChromeLabs/bubblewrap). It needs your game
  to be live on HTTPS. The Capacitor way described in section 7 does
  not need a live website, so it is the easier choice for most buyers.


----------------------------------------------------------
11. TROUBLESHOOTING
----------------------------------------------------------
Game stays blank
  Make sure ALL files and the icons folder are uploaded and nothing
  was renamed. Open the browser console (F12) to see any error.

Changes do not appear on the website
  Clear the browser cache or open the page in a private window. If you
  use the offline version, change CACHE_VERSION in sw.js (for example
  'ludo-v2') every time you upload a new version.

Changes do not appear in the Android app
  Run   npm run sync   again and rebuild in Android Studio.

"npm" is not recognised
  Install Node.js (LTS) and reopen the terminal.

No sound
  Tap anywhere first (browsers allow sound only after a tap), check the
  speaker button is not muted and the phone is not in silent mode.

Ads do not show
  See section 5. Test on the live HTTPS website, not on file://.


----------------------------------------------------------
12. LICENSE
----------------------------------------------------------
You may use this game in your own projects and publish it on your own
websites and app store accounts. You may change the design, name and
ads. You may not resell or redistribute the source code as it is, as a
template or as a competing product on any marketplace. Follow the
license terms of the marketplace where you bought this item.

Enjoy the game and good luck with your project!
