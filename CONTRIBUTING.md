# Contributing

Bug reports and pull requests are welcome. Read the [code of conduct](./CODE_OF_CONDUCT.md) before you take part.

## Set up the repo

The repo is a Yarn workspace: the library sits in the root, and an Expo example app sits in `example/`. Use the Node version in [`.nvmrc`](./.nvmrc), then install from the root:

```sh
yarn
```

Use Yarn for everything here. The workspace depends on it, and npm won't install it without changes.

## Run the example

The example app runs the library from source. JavaScript changes reload right away, and native changes need a rebuild.

```sh
yarn example start
yarn example android
yarn example ios
```

`start` runs Metro. `android` and `ios` build the app and launch it, and the first run creates `example/android` and `example/ios` with `expo prebuild`.

To edit the native code in an IDE, open `example/android` in Android Studio, where the Kotlin sources are in the `react-native-inkpad` module. On iOS, open `example/ios/InkpadExample.xcworkspace` in Xcode and find the Objective-C++ sources under Pods > Development Pods > react-native-inkpad.

The library needs the New Architecture. The Metro log line that starts with `Running "InkpadExample"` shows `"fabric":true` when it's on.

## Check your change

```sh
yarn lint
yarn typecheck
yarn test
```

`yarn lint` runs Biome, and `yarn format` applies its fixes. `yarn test` runs the Vitest unit tests.

The Kotlin unit tests run from the prebuilt example:

```sh
cd example/android
./gradlew :react-native-inkpad:testDebugUnitTest
```

## Run the end-to-end tests

The tests in `e2e/` install a release build of the example on a running emulator or simulator. `INKPAD_APP_PATH` points them at that build.

On Android, the build script targets arm64 emulators, like the ones on Apple silicon Macs:

```sh
yarn e2e:android:build
INKPAD_APP_PATH=example/android/app/build/outputs/apk/release/app-release.apk yarn e2e --target android
```

On iOS, build the release app for the simulator first:

```sh
cd example
npx expo prebuild --platform ios
cd ios
xcodebuild -workspace InkpadExample.xcworkspace -scheme InkpadExample -configuration Release -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath build CODE_SIGNING_ALLOWED=NO build
cd ../..
INKPAD_APP_PATH=example/ios/build/Build/Products/Release-iphonesimulator/InkpadExample.app yarn e2e --target ios
```

The tests use the booted simulator, or the one you name in `E2E_IOS_DEVICE`. When you're done, stop the device daemon with `npx agent-device daemon stop`.

CI runs all of these, plus a package build, on every push and pull request to `main`.

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/en): `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:` and so on. Lefthook runs Biome on your staged files and the type check before each commit, and commitlint checks the message. If the hooks don't run, install them with `yarn lefthook install`.

## Open a pull request

Keep each pull request to one change, and make sure the checks pass. If you change the public API, update the README in the same pull request. For API changes and bigger rewrites, open an issue first to agree on the approach before you write code.

## Releases

The maintainer runs `yarn release`. release-it bumps the version, tags it `v<version>` and creates a GitHub release with notes from the commit messages. The tag starts the Publish workflow, which builds the package and stages it on npm with provenance. The version goes live once the maintainer approves it under Staged Packages on npmjs.com, with 2FA.
