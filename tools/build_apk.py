#!/usr/bin/env python3
"""
Complete Standalone Android APK Builder for Neon Snake 3D
Uses Android aapt, javac, d8, zipalign, and apksigner (v1 + v2 + v3 schemes).
"""

import os
import sys
import shutil
import struct
import zlib
import subprocess

def create_cyber_icon(size):
    """Generate a vibrant cyber snake icon PNG with zlib and struct."""
    header = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data)
    ihdr = struct.pack('>I', len(ihdr_data)) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)

    raw_data = b''
    cx, cy = size / 2.0, size / 2.0
    r_max = size * 0.45

    for y in range(size):
        raw_data += b'\x00' # filter byte
        for x in range(size):
            dx = x - cx
            dy = y - cy
            dist = (dx * dx + dy * dy) ** 0.5

            if dist > r_max:
                # Dark cyber background outside circle
                raw_data += bytes([10, 15, 25])
            elif dist > r_max - 3:
                # Cyan neon border
                raw_data += bytes([0, 240, 255])
            else:
                # Inside circle
                # Eye/visor in center
                eye_dist = ((x - (cx + 4))**2 + (y - cy)**2)**0.5
                if eye_dist < size * 0.12:
                    raw_data += bytes([255, 255, 255]) # bright white pupil
                elif eye_dist < size * 0.22:
                    raw_data += bytes([255, 0, 128])   # pink iris
                else:
                    # Cyber grid pattern
                    if x % 6 == 0 or y % 6 == 0:
                        raw_data += bytes([20, 40, 70])
                    else:
                        raw_data += bytes([15, 20, 35])

    idat_data = zlib.compress(raw_data)
    idat_crc = zlib.crc32(b'IDAT' + idat_data)
    idat = struct.pack('>I', len(idat_data)) + b'IDAT' + idat_data + struct.pack('>I', idat_crc)

    iend_crc = zlib.crc32(b'IEND')
    iend = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)

    return header + ihdr + idat + iend

def run_cmd(cmd, cwd=None):
    print(f">> Running: {cmd}")
    res = subprocess.run(cmd, shell=True, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(f"Error executing: {cmd}\nSTDOUT:\n{res.stdout}\nSTDERR:\n{res.stderr}")
        sys.exit(1)
    return res.stdout

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    build_dir = "/tmp/neon_apk_build"
    if os.path.exists(build_dir):
        shutil.rmtree(build_dir)
    os.makedirs(build_dir)

    print("=== Step 1: Building Web Assets ===")
    run_cmd("npm run build", cwd=root_dir)

    print("=== Step 2: Preparing Android Project Structure ===")
    res_dir = os.path.join(build_dir, "res")
    src_dir = os.path.join(build_dir, "src", "com", "neonsnake", "multiplayer")
    bin_dir = os.path.join(build_dir, "bin")
    dex_dir = os.path.join(build_dir, "dex")
    assets_dir = os.path.join(build_dir, "assets", "www")

    os.makedirs(os.path.join(res_dir, "values"))
    os.makedirs(os.path.join(res_dir, "mipmap-mdpi"))
    os.makedirs(os.path.join(res_dir, "mipmap-hdpi"))
    os.makedirs(os.path.join(res_dir, "mipmap-xhdpi"))
    os.makedirs(os.path.join(res_dir, "mipmap-xxhdpi"))
    os.makedirs(src_dir)
    os.makedirs(bin_dir)
    os.makedirs(dex_dir)
    os.makedirs(assets_dir)

    # Copy web assets to assets/www
    dist_dir = os.path.join(root_dir, "dist")
    if os.path.exists(dist_dir):
        shutil.copytree(dist_dir, assets_dir, dirs_exist_ok=True)

    # Strings.xml
    with open(os.path.join(res_dir, "values", "strings.xml"), "w") as f:
        f.write('''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Neon Snake 3D</string>
</resources>''')

    # Icons
    with open(os.path.join(res_dir, "mipmap-mdpi", "ic_launcher.png"), "wb") as f:
        f.write(create_cyber_icon(48))
    with open(os.path.join(res_dir, "mipmap-hdpi", "ic_launcher.png"), "wb") as f:
        f.write(create_cyber_icon(72))
    with open(os.path.join(res_dir, "mipmap-xhdpi", "ic_launcher.png"), "wb") as f:
        f.write(create_cyber_icon(96))
    with open(os.path.join(res_dir, "mipmap-xxhdpi", "ic_launcher.png"), "wb") as f:
        f.write(create_cyber_icon(144))

    # AndroidManifest.xml
    manifest_path = os.path.join(build_dir, "AndroidManifest.xml")
    with open(manifest_path, "w") as f:
        f.write('''<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.neonsnake.multiplayer"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="33" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:hardwareAccelerated="true"
        android:usesCleartextTraffic="true"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="sensorLandscape"
            android:configChanges="orientation|screenSize|keyboardHidden|smallestScreenSize|screenLayout">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>''')

    # MainActivity.java
    main_activity_path = os.path.join(src_dir, "MainActivity.java")
    with open(main_activity_path, "w") as f:
        f.write('''package com.neonsnake.multiplayer;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.Toast;

public class MainActivity extends Activity {
    private static final String DEFAULT_SERVER = "https://ais-pre-b57r7elgrrpjvi74b7vnui-468670053177.europe-west3.run.app";
    private static final String PREFS_NAME = "NeonSnakePrefs";
    private static final String KEY_SERVER_URL = "server_url";

    private WebView mWebView;
    private SharedPreferences mPrefs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        setImmersiveMode();

        mPrefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        mWebView = new WebView(this);
        mWebView.setBackgroundColor(Color.BLACK);

        WebSettings settings = mWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                view.loadUrl(url);
                return true;
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                String html = "<html><body style='background:#050505;color:#00ffff;font-family:sans-serif;text-align:center;padding:35px;'>"
                    + "<h1 style='color:#ff007f;font-size:26px;'>NEON SNAKE 3D</h1>"
                    + "<p style='color:#ffffff;font-size:14px;'>Cannot connect to server:</p>"
                    + "<p style='color:#888;font-size:12px;word-break:break-all;'>" + failingUrl + "</p>"
                    + "<div style='margin-top:25px;'>"
                    + "<button style='background:#00ffff;color:#000;border:none;padding:12px 24px;border-radius:12px;font-weight:bold;font-size:13px;cursor:pointer;margin:5px;' onclick='location.reload()'>RETRY CONNECTION</button>"
                    + "<button style='background:#222;color:#fff;border:1px solid #444;padding:12px 24px;border-radius:12px;font-size:13px;cursor:pointer;margin:5px;' onclick=\\"location.href='file:///android_asset/www/index.html'\\">PLAY OFFLINE (LOCAL)</button>"
                    + "</div>"
                    + "<p style='color:#777;font-size:11px;margin-top:25px;'>Tip: Long-press anywhere on screen to enter custom local Wi-Fi / Hotspot IP</p>"
                    + "</body></html>";
                view.loadDataWithBaseURL(null, html, "text/html", "utf-8", null);
            }
        });

        mWebView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                return super.onConsoleMessage(consoleMessage);
            }
        });

        mWebView.setOnLongClickListener(new View.OnLongClickListener() {
            @Override
            public boolean onLongClick(View v) {
                showServerConfigDialog();
                return true;
            }
        });

        setContentView(mWebView);

        String activeUrl = mPrefs.getString(KEY_SERVER_URL, DEFAULT_SERVER);
        mWebView.loadUrl(activeUrl);
    }

    private void setImmersiveMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            );
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            setImmersiveMode();
        }
    }

    private void showServerConfigDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Neon Snake 3D Server");
        builder.setMessage("Connect to Cloud Server or local Wi-Fi / AP Hotspot (e.g. http://192.168.43.1:3000):");

        final EditText input = new EditText(this);
        String current = mPrefs.getString(KEY_SERVER_URL, DEFAULT_SERVER);
        input.setText(current);
        input.setSelectAllOnFocus(true);
        builder.setView(input);

        builder.setPositiveButton("Connect", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                String newUrl = input.getText().toString().trim();
                if (newUrl.isEmpty()) newUrl = DEFAULT_SERVER;
                if (!newUrl.startsWith("http://") && !newUrl.startsWith("https://") && !newUrl.startsWith("file://")) {
                    newUrl = "http://" + newUrl;
                }
                mPrefs.edit().putString(KEY_SERVER_URL, newUrl).apply();
                mWebView.loadUrl(newUrl);
                Toast.makeText(MainActivity.this, "Connecting to " + newUrl, Toast.LENGTH_SHORT).show();
            }
        });

        builder.setNeutralButton("Reset Cloud", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                mPrefs.edit().putString(KEY_SERVER_URL, DEFAULT_SERVER).apply();
                mWebView.loadUrl(DEFAULT_SERVER);
                Toast.makeText(MainActivity.this, "Reset to Cloud Server", Toast.LENGTH_SHORT).show();
            }
        });

        builder.setNegativeButton("Cancel", null);
        builder.show();
    }

    @Override
    public void onBackPressed() {
        if (mWebView.canGoBack()) {
            mWebView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
''')

    print("=== Step 3: Compiling Resources with aapt ===")
    base_apk = os.path.join(build_dir, "base.apk")
    gen_src = os.path.join(build_dir, "gen")
    os.makedirs(gen_src)

    run_cmd(f"aapt package -f -m -J {gen_src} -M {manifest_path} -S {res_dir} -I /tmp/android.jar -A {os.path.join(build_dir, 'assets')} -F {base_apk}")

    print("=== Step 4: Compiling Java Sources ===")
    java_files = [
        os.path.join(gen_src, "com", "neonsnake", "multiplayer", "R.java"),
        main_activity_path
    ]
    run_cmd(f"javac -source 1.8 -target 1.8 -cp /tmp/android.jar:{gen_src} -d {bin_dir} {' '.join(java_files)}")

    print("=== Step 5: Dexing with D8 ===")
    run_cmd(f"java -cp /tmp/r8.jar com.android.tools.r8.D8 --output {dex_dir} --lib /tmp/android.jar $(find {bin_dir} -name '*.class')")

    print("=== Step 6: Assembling & Zipaligning APK ===")
    unaligned_apk = os.path.join(build_dir, "unaligned.apk")
    shutil.copy(base_apk, unaligned_apk)

    # Add classes.dex to the root of the unaligned APK
    run_cmd(f"aapt add {unaligned_apk} classes.dex", cwd=dex_dir)

    # 4-byte zipalign
    aligned_apk = os.path.join(build_dir, "aligned.apk")
    run_cmd(f"zipalign -f -v -p 4 {unaligned_apk} {aligned_apk}")

    print("=== Step 7: Signing APK with apksigner (v1 + v2 + v3 schemes) ===")
    keystore_path = os.path.join(build_dir, "release.keystore")
    run_cmd(f'keytool -genkeypair -v -keystore {keystore_path} -alias neonsnake -keyalg RSA -keysize 2048 -validity 20000 -storepass 123456 -keypass 123456 -dname "CN=NeonSnake3D, OU=GameStudio, O=Dev, L=World, ST=Global, C=US"')

    signed_apk = os.path.join(build_dir, "release-signed.apk")
    run_cmd(f"apksigner sign --ks {keystore_path} --ks-pass pass:123456 --ks-key-alias neonsnake --key-pass pass:123456 --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --out {signed_apk} {aligned_apk}")

    print("=== Step 8: Verifying APK Signature Schemes ===")
    verify_output = run_cmd(f"apksigner verify --verbose {signed_apk}")
    print(verify_output)

    # Place in project root
    dest_apk_1 = os.path.join(root_dir, "neon-snake.apk")
    dest_apk_2 = os.path.join(root_dir, "neon-snake-v1.0.apk")

    shutil.copy(signed_apk, dest_apk_1)
    shutil.copy(signed_apk, dest_apk_2)

    apk_size_mb = os.path.getsize(dest_apk_1) / (1024 * 1024)
    print(f"\n==========================================")
    print(f"🎉 SUCCESS! Fully certified Android APK ready:")
    print(f"  - {dest_apk_1} ({apk_size_mb:.2f} MB)")
    print(f"  - {dest_apk_2} ({apk_size_mb:.2f} MB)")
    print(f"==========================================")

if __name__ == "__main__":
    main()
