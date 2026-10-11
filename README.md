<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/SectionTN/react-native-inkpad/main/.github/assets/inkpad-banner-dark.png" />
  <img alt="React Native Inkpad, a native ink canvas for React Native" src="https://raw.githubusercontent.com/SectionTN/react-native-inkpad/main/.github/assets/inkpad-banner-light.png" />
</picture>

A native ink canvas for React Native. It draws with androidx.ink on Android and PencilKit on iOS, so strokes get each platform's own latency, pressure and palm rejection. There is no WebView.

The package is at 0.x, and the API can still change before 1.0. Web support lands in 0.2.

<picture>
  <source type="image/webp" srcset="https://raw.githubusercontent.com/SectionTN/react-native-inkpad/main/.github/assets/inkpad-showcase.webp" />
  <img alt="The example app on iOS and Android side by side: the same drawing in pen, marker and highlighter, the export sheet, and a signature" src="https://raw.githubusercontent.com/SectionTN/react-native-inkpad/main/.github/assets/inkpad-showcase.gif" />
</picture>

## Install

```sh
npm install react-native-inkpad
```

You need React Native 0.80 or newer with the New Architecture, iOS 15.1 or newer and Android minSdk 24. In Expo, use a development build. The library doesn't run in Expo Go.

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

## Props

| Prop | Type | Default |
| --- | --- | --- |
| `brush` | `{ type?: 'pen' \| 'marker' \| 'highlighter'; color?: ColorValue; size?: number }` | pen, black, 3 |
| `tool` | `'draw' \| 'erase'` | `'draw'` |
| `editable` | `boolean` | `true` |
| `background` | `{ color?: ColorValue }` | transparent |
| `onStrokeStart`, `onStrokeEnd` | `() => void` | |
| `onChange` | `({ strokeCount, canUndo, canRedo }) => void` | |

The eraser removes whole strokes. Sizes are in dp on Android and points on iOS. `style` takes the usual view styles, borders and rounded corners included, and strokes stay inside the border.

## Ref methods

| Method | Returns |
| --- | --- |
| `undo()`, `redo()`, `clear()` | `void` |
| `getStrokes()` | `Promise<InkDocument>` |
| `setStrokes(doc)` | `Promise<void>` |
| `toImage({ format, quality, scale, trim, background, base64 })` | `Promise<{ uri, width, height, base64? }>` |
| `toSVG({ trim, background })` | `Promise<string>` |

Exported images land in the app's cache directory. Move or delete them when you're done.

A stroke document is plain JSON: a version, the canvas size, and a list of strokes. Each stroke has a brush and a flat list of points, six numbers per point (x, y, time, pressure, tilt, orientation, with -1 for values the device didn't report). You can store it and load it back later with `setStrokes`.

Failed calls reject with an `InkpadError` whose `code` is one of `E_NOT_MOUNTED`, `E_TIMEOUT`, `E_INVALID_DOCUMENT`, `E_UNSUPPORTED_VERSION`, `E_EMPTY`, `E_EXPORT_FAILED` or `E_NATIVE`.

## Coming from react-native-signature-canvas

Change the import and keep the rest of your screen:

```diff
- import SignatureCanvas from 'react-native-signature-canvas';
+ import SignatureCanvas from 'react-native-inkpad/signature-canvas';
```

It takes the same props, callbacks and ref methods, and `onOK` still gets a `data:` URL. Signatures you saved with `getData` load with `fromData`. A few things differ:

- Props that only made sense in a WebView, like `customHtml` and `webviewProps`, are ignored, with one warning in development. From `webStyle`, only a rule that hides the footer still works.
- The footer looks different: Clear and Confirm buttons with icons, and the description between them. `clearText`, `confirmText` and `descriptionText` still set the words. For your own footer, pass `renderFooter`. It gets the same methods as the ref, and returning `null` hides the footer.
- `maxWidth` sets the pen size. The pen thins with speed on its own, so `minWidth`, `dotSize` and `velocityFilterWeight` are ignored.
- `bgSrc`, `dataURL` and `setDataURL` arrive in 0.3.
- The eraser removes whole strokes instead of pixels.

## Platform notes

Strokes look a little different on Android and iOS, because each platform draws with its own engine. The canvas keeps ink colors exact in dark mode, even when Android forces dark colors onto the app.

On Android, the pen follows a stylus's pressure. Fingers and mice rarely report pressure, so their pen strokes thin out as they speed up, the way react-native-signature-canvas draws.

## License

MIT
