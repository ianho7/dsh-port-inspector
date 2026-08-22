# dsh-runtime-inspector

## Real Stock DSH Web smoke

The opt-in Web integration test starts a temporary Stock DSH Web Profile, opens it in Chromium, verifies the Bundle's Browser artifact and Slots, reads the real inventory, and confirms one identity-fenced external action through the UI.

    $env:DSH_REPO = 'D:\project\deepseek-harness'
    $env:DSH_WEB_E2E = '1'
    node --test tests/dsh-web-smoke.test.mjs

The test uses the built DSH checkout named by DSH_REPO; run it once per declared DSH version.
