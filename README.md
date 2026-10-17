<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/SectionTN/react-native-inkpad/main/.github/assets/inkpad-banner-dark.png" />
  <img alt="React Native Inkpad, a native ink canvas for React Native" src="https://raw.githubusercontent.com/SectionTN/react-native-inkpad/main/.github/assets/inkpad-banner-light.png" />
</picture>

[![npm](https://img.shields.io/npm/v/react-native-inkpad?style=flat-square)](https://www.npmjs.com/package/react-native-inkpad)
[![license](https://img.shields.io/npm/l/react-native-inkpad?style=flat-square&label=license)](https://github.com/SectionTN/react-native-inkpad/blob/main/LICENSE)
[![Context7](https://img.shields.io/badge/Context7-docs-blue?style=flat-square)](https://context7.com/sectiontn/react-native-inkpad)

A native ink canvas for React Native. It draws with androidx.ink on Android, PencilKit on iOS and Canvas 2D on the web.

<picture>
  <source type="image/webp" srcset="https://raw.githubusercontent.com/SectionTN/react-native-inkpad/main/.github/assets/inkpad-showcase.webp" />
  <img alt="The example app on iOS and Android side by side: the same drawing in pen, marker and highlighter, the export sheet, and a signature" src="https://raw.githubusercontent.com/SectionTN/react-native-inkpad/main/.github/assets/inkpad-showcase.gif" />
</picture>

## Features

- Pen, marker and highlighter brushes, an eraser, undo and redo
- Background images and a stylus-only mode
- Export to PNG, JPEG or SVG, optionally trimmed to the drawing
- Save a drawing as JSON and load it back
- Web support, with the Ink API for lower latency in Chrome, Edge and other Chromium browsers
- [Drop-in replacement](#migrating-from-react-native-signature-canvas) for react-native-signature-canvas

## Installation

```sh
npm install react-native-inkpad
cd ios && pod install
```

Requirements:

- React Native 0.84+ (Expo SDK 56+) with the New Architecture
- iOS 15.1+
- Android 7.0+ (API 24)
- Web: react-native-web 0.21+ and a browser with Pointer Events
- Expo: a development build (Expo Go isn't supported)

## Usage

```tsx
import { useRef } from 'react';
import { Button, View } from 'react-native';
import { InkCanvas, type InkCanvasRef } from 'react-native-inkpad';

export function SignatureField() {
  const canvas = useRef<InkCanvasRef>(null);

  const save = async () => {
    const image = await canvas.current?.toImage({ trim: { padding: 8 } });
    console.log(image?.uri);
  };

  return (
    <View>
      <InkCanvas
        ref={canvas}
        style={{ height: 240 }}
        brush={{ color: '#111111', size: 3 }}
        background={{ color: '#FFFFFF' }}
      />
      <Button title="Save" onPress={save} />
    </View>
  );
}
```

## API

### Props

`InkCanvas` takes the usual `View` props, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `brush` | `{ type, color, size }` | black pen, size 3 | Brush for new strokes. `type` is `'pen'`, `'marker'` or `'highlighter'`. |
| `tool` | `'draw' \| 'erase'` | `'draw'` | The eraser removes whole strokes. |
| `inputMode` | `'any' \| 'stylus'` | `'any'` | With `'stylus'`, only a pen draws and fingers go to the parent. |
| `editable` | `boolean` | `true` | Set to `false` to turn drawing off. |
| `background` | `{ color, image, fit }` | transparent | Canvas color and an image under the ink, both exported. `image` takes an image source, `fit` is `'contain'` or `'cover'`. On web, an image from another origin needs CORS headers. |
| `onStrokeStart` | `() => void` | | Called when a stroke starts. |
| `onStrokeEnd` | `() => void` | | Called when a stroke ends. |
| `onChange` | `(state) => void` | | Called after every change with `{ strokeCount, canUndo, canRedo }`. |
| `onError` | `(error) => void` | | Called with an `InkpadError` when the background image fails to load. |

### Methods

| Method | Description |
| --- | --- |
| `undo()`, `redo()` | Step back or forward through the history. |
| `clear()` | Remove every stroke. |
| `getStrokes()` | Get the strokes as a plain object you can store as JSON. |
| `setStrokes(doc)` | Replace the drawing with strokes from `getStrokes()`. |
| `toImage({ format, quality, scale, trim, background, base64 })` | Export a PNG or JPEG. Resolves to `{ uri, width, height, base64? }`. On web, `uri` is a `blob:` URL. |
| `toSVG({ trim, background })` | Export an SVG string. It links the background image by URI. |

### Errors

Failed calls throw an `InkpadError`. Its `code` is one of:

| Code | Meaning |
| --- | --- |
| `E_NOT_MOUNTED` | The canvas isn't mounted, or it unmounted before the call finished. |
| `E_TIMEOUT` | The native view didn't answer within 15 seconds. |
| `E_INVALID_DOCUMENT` | `setStrokes()` got a malformed document. |
| `E_UNSUPPORTED_VERSION` | The document was saved by a newer version of the library. |
| `E_EMPTY` | `trim` was set but the canvas is empty. |
| `E_EXPORT_FAILED` | The image couldn't be created or saved. |
| `E_IMAGE_LOAD` | The background image couldn't be loaded. It goes to `onError`. |
| `E_NATIVE` | Any other native error. |

## Migrating from react-native-signature-canvas

Change the import:

```diff
- import SignatureCanvas from 'react-native-signature-canvas';
+ import SignatureCanvas from 'react-native-inkpad/signature-canvas';
```

Props, callbacks and ref methods keep working, and `fromData` loads signatures you saved with `getData`. A few things change:

- Props that don't apply anymore, like `customHtml` or `minWidth`, are ignored. A dev warning lists them.
- The footer has a new look. Pass `renderFooter` to draw your own.
- The eraser removes whole strokes, not pixels. It can't remove a `dataURL` image.
- A `dataURL` image keeps its aspect ratio instead of stretching to the pad.

## Versioning

From 1.0, releases follow [semver](https://semver.org):

- Patches fix bugs, minors add props, methods and error codes
- Removing or renaming anything public, the signature canvas adapter included, waits for a major
- Documents from `getStrokes()` load in every later version
- A minor can change how strokes look, never the saved document format

## Roadmap

- [x] 0.1: Android and iOS
- [x] 0.2: React Native 0.84+ (Expo SDK 56+)
- [x] 0.3: Web
- [x] 0.4: Background images, stylus-only mode and `onError`
- [x] 1.0: First stable release

## Contributing

See the [contributing guide](https://github.com/SectionTN/react-native-inkpad/blob/main/CONTRIBUTING.md). Questions and ideas go to [Discussions](https://github.com/SectionTN/react-native-inkpad/discussions).

## License

MIT

---

<p align="center">Made by <a href="https://github.com/SectionTN">SectionTN</a></p>
