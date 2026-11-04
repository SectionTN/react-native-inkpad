#import <Foundation/Foundation.h>
#import <ImageIO/ImageIO.h>
#import <PencilKit/PencilKit.h>

#import "../../../ios/INKColor.h"
#import "../../../ios/INKDocumentRenderer.h"
#import "../../../ios/INKImageExporter.h"
#import "../../../ios/INKStrokeCodec.h"

typedef NSString *_Nullable (^INKInspect)(size_t width, size_t height, const uint8_t *rgba);

static int failures = 0;
static int pending = 0;

static void fail(NSString *name, NSString *reason)
{
  printf("FAIL %s: %s\n", name.UTF8String, reason.UTF8String);
  failures++;
}

static NSString *json(id object)
{
  NSData *data = [NSJSONSerialization dataWithJSONObject:object options:0 error:nil];
  return [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
}

static NSDictionary *parse(NSString *_Nullable string)
{
  NSData *data = [string dataUsingEncoding:NSUTF8StringEncoding];
  return data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil;
}

// The options the JS side sends, with the case's own values on top.
static NSString *options(NSDictionary *overrides)
{
  NSMutableDictionary *result = [@{
    @"format" : @"png",
    @"quality" : @0.9,
    @"scale" : @3,
    @"maxSize" : @0,
    @"trim" : @NO,
    @"padding" : @0,
    @"background" : @YES,
    @"base64" : @NO,
    @"backgroundColor" : @"",
    @"backgroundImageUri" : @"",
    @"backgroundFit" : @"contain",
  } mutableCopy];
  [result addEntriesFromDictionary:overrides];
  return json(result);
}

// Hands the result to the handler on the main queue and stops the run loop after the last job.
static INKExportCompletion track(void (^handler)(NSString *json, NSString *code, NSString *message))
{
  pending++;
  return ^(NSString *result, NSString *code, NSString *message) {
    dispatch_async(dispatch_get_main_queue(), ^{
      handler(result, code, message);
      if (--pending == 0) {
        CFRunLoopStop(CFRunLoopGetMain());
      }
    });
  };
}

// Decodes the exported file to premultiplied sRGB RGBA, then deletes it.
static NSData *pixels(NSString *result, size_t *width, size_t *height)
{
  NSDictionary *parsed = parse(result);
  NSURL *url = [NSURL URLWithString:parsed[@"uri"]];
  NSData *file = [NSData dataWithContentsOfURL:url];
  [NSFileManager.defaultManager removeItemAtURL:url error:nil];
  CGImageSourceRef source = file ? CGImageSourceCreateWithData((__bridge CFDataRef)file, NULL) : NULL;
  CGImageRef image = source ? CGImageSourceCreateImageAtIndex(source, 0, NULL) : NULL;
  if (source) {
    CFRelease(source);
  }
  if (image == NULL) {
    return nil;
  }
  *width = CGImageGetWidth(image);
  *height = CGImageGetHeight(image);
  if ([parsed[@"width"] unsignedLongValue] != *width || [parsed[@"height"] unsignedLongValue] != *height) {
    CGImageRelease(image);
    return nil;
  }
  NSMutableData *bytes = [NSMutableData dataWithLength:*width * *height * 4];
  CGColorSpaceRef srgb = CGColorSpaceCreateWithName(kCGColorSpaceSRGB);
  CGContextRef context = CGBitmapContextCreate(bytes.mutableBytes, *width, *height, 8, *width * 4, srgb,
                                               (CGBitmapInfo)kCGImageAlphaPremultipliedLast);
  CGContextDrawImage(context, CGRectMake(0, 0, *width, *height), image);
  CGContextRelease(context);
  CGColorSpaceRelease(srgb);
  CGImageRelease(image);
  return bytes;
}

static void compare(NSString *name, NSString *result, NSString *_Nullable expected, INKInspect inspect)
{
  size_t width = 0, height = 0, expectedWidth = 0, expectedHeight = 0;
  NSData *actual = pixels(result, &width, &height);
  NSData *reference = expected ? pixels(expected, &expectedWidth, &expectedHeight) : nil;
  if (actual == nil || reference == nil) {
    fail(name, @"an image did not decode at its reported size");
    return;
  }
  if (width != expectedWidth || height != expectedHeight) {
    fail(name, [NSString stringWithFormat:@"%zux%zu, the canvas gives %zux%zu", width, height, expectedWidth,
                                          expectedHeight]);
    return;
  }
  if (![actual isEqualToData:reference]) {
    const uint8_t *a = actual.bytes;
    const uint8_t *b = reference.bytes;
    size_t differ = 0;
    for (size_t i = 0; i < actual.length; i += 4) {
      differ += memcmp(a + i, b + i, 4) != 0;
    }
    fail(name, [NSString stringWithFormat:@"%zu pixels differ from the canvas", differ]);
    return;
  }
  NSString *reason = inspect ? inspect(width, height, actual.bytes) : nil;
  if (reason != nil) {
    fail(name, reason);
    return;
  }
  printf("ok %s\n", name.UTF8String);
}

// The canvas exports what setStrokes installed, at its own size and color, so the reference is the exporter itself.
static void canvasCase(NSString *name, NSString *document, NSDictionary *overrides, INKInspect inspect)
{
  NSString *optionsJSON = options(overrides);
  NSDictionary *size = parse(document)[@"size"];
  NSString *color = overrides[@"backgroundColor"];
  [INKDocumentRenderer renderDocument:document
                              options:optionsJSON
                           completion:track(^(NSString *result, NSString *code, NSString *message) {
                             if (result == nil) {
                               fail(name, [NSString stringWithFormat:@"%@ %@", code, message]);
                               return;
                             }
                             NSString *decodeCode = nil;
                             NSString *decodeMessage = nil;
                             INKDecodedDrawing *decoded = [INKStrokeCodec decode:document
                                                                      errorCode:&decodeCode
                                                                        message:&decodeMessage];
                             [INKImageExporter exportDrawing:decoded.drawing
                                                  canvasSize:CGSizeMake([size[@"width"] doubleValue],
                                                                        [size[@"height"] doubleValue])
                                                 canvasColor:color ? INKColorFromHex(color) : UIColor.clearColor
                                             backgroundImage:nil
                                                       cover:NO
                                                 optionsJSON:optionsJSON
                                                  completion:track(^(NSString *expected, NSString *c, NSString *m) {
                                                    compare(name, result, expected, inspect);
                                                  })];
                           })];
}

static void errorCase(NSString *name, NSString *document, NSDictionary *overrides, NSString *code, NSString *prefix)
{
  [INKDocumentRenderer renderDocument:document
                              options:options(overrides)
                           completion:track(^(NSString *result, NSString *errorCode, NSString *message) {
                             if (result != nil || ![errorCode isEqualToString:code] || ![message hasPrefix:prefix]) {
                               fail(name, [NSString stringWithFormat:@"got %@ %@ %@", result, errorCode, message]);
                               return;
                             }
                             printf("ok %s\n", name.UTF8String);
                           })];
}

int main(int argc, char **argv)
{
  @autoreleasepool {
    if (argc < 2) return 2;
    NSString *sample = [NSString stringWithContentsOfFile:[NSString stringWithUTF8String:argv[1]]
                                                 encoding:NSUTF8StringEncoding
                                                    error:nil];
    if (sample == nil) return 2;

    canvasCase(@"canvas {}", sample, @{}, ^NSString *(size_t width, size_t height, const uint8_t *rgba) {
      return rgba[3] == 0 ? nil : @"the corner is not transparent";
    });
    canvasCase(@"canvas trim", sample, @{@"trim" : @YES, @"padding" : @8},
               ^NSString *(size_t width, size_t height, const uint8_t *rgba) {
                 return width < 360 * 3 && height < 440 * 3 ? nil : @"the image is not trimmed";
               });
    canvasCase(@"canvas backgroundColor", sample, @{@"backgroundColor" : @"#FFEEDDFF"},
               ^NSString *(size_t width, size_t height, const uint8_t *rgba) {
                 BOOL paper = abs(rgba[0] - 0xFF) <= 2 && abs(rgba[1] - 0xEE) <= 2 && abs(rgba[2] - 0xDD) <= 2 &&
                     rgba[3] == 0xFF;
                 return paper ? nil
                              : [NSString stringWithFormat:@"the corner is %02X%02X%02X%02X", rgba[0], rgba[1],
                                                           rgba[2], rgba[3]];
               });
    canvasCase(@"canvas maxSize", sample, @{@"maxSize" : @160},
               ^NSString *(size_t width, size_t height, const uint8_t *rgba) {
                 return MAX(width, height) == 160
                     ? nil
                     : [NSString stringWithFormat:@"the longest side is %zu", MAX(width, height)];
               });

    NSString *empty = @"{\"version\":1,\"size\":{\"width\":320,\"height\":240},\"strokes\":[]}";
    [INKDocumentRenderer renderDocument:empty
                                options:options(@{@"scale" : @2})
                             completion:track(^(NSString *result, NSString *code, NSString *message) {
                               size_t width = 0, height = 0;
                               NSData *bytes = result ? pixels(result, &width, &height) : nil;
                               const uint8_t *rgba = bytes.bytes;
                               BOOL clear = bytes != nil;
                               for (NSUInteger i = 0; clear && i < bytes.length; i++) {
                                 clear = rgba[i] == 0;
                               }
                               if (width != 640 || height != 480 || !clear) {
                                 fail(@"empty", [NSString stringWithFormat:@"%zux%zu, transparent %d, %@ %@", width,
                                                                          height, clear, code, message]);
                                 return;
                               }
                               printf("ok empty\n");
                             })];

    errorCase(@"image", sample, @{@"backgroundImageUri" : @"file:///nonexistent.png"}, @"E_IMAGE_LOAD",
              @"could not load the background image file:///nonexistent.png");
    errorCase(@"invalid strokes", @"{\"version\":1,\"size\":{\"width\":10,\"height\":10},\"strokes\":3}", @{},
              @"E_INVALID_DOCUMENT", @"strokes must be an array");
    errorCase(@"invalid size", @"{\"version\":1,\"strokes\":[]}", @{}, @"E_INVALID_DOCUMENT", @"size");

    NSMutableArray<NSNumber *> *order = [NSMutableArray new];
    NSMutableSet<NSString *> *files = [NSMutableSet new];
    for (NSInteger i = 0; i < 20; i++) {
      [INKDocumentRenderer renderDocument:sample
                                  options:options(@{@"scale" : @1, @"maxSize" : @64})
                               completion:track(^(NSString *result, NSString *code, NSString *message) {
                                 [order addObject:@(i)];
                                 NSString *uri = parse(result)[@"uri"];
                                 if (uri != nil) {
                                   [files addObject:uri];
                                   [NSFileManager.defaultManager removeItemAtURL:[NSURL URLWithString:uri] error:nil];
                                 }
                                 if (order.count < 20) {
                                   return;
                                 }
                                 NSArray *expected = [order sortedArrayUsingSelector:@selector(compare:)];
                                 if (files.count != 20 || ![order isEqualToArray:expected]) {
                                   fail(@"many", [NSString stringWithFormat:@"%lu files, completed in order %@",
                                                                            (unsigned long)files.count,
                                                                            [order componentsJoinedByString:@","]]);
                                   return;
                                 }
                                 printf("ok many\n");
                               })];
    }

    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 90 * NSEC_PER_SEC), dispatch_get_main_queue(), ^{
      printf("FAIL timeout: %d jobs still pending\n", pending);
      exit(1);
    });
    CFRunLoopRun();
    return failures == 0 ? 0 : 1;
  }
}
