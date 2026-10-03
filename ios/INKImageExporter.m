#import "INKImageExporter.h"

@implementation INKImageExporter

+ (void)exportDrawing:(PKDrawing *)drawing
           canvasSize:(CGSize)canvasSize
          canvasColor:(UIColor *)canvasColor
          optionsJSON:(NSString *)optionsJSON
           completion:(INKExportCompletion)completion
{
  NSData *data = [optionsJSON dataUsingEncoding:NSUTF8StringEncoding];
  id parsed = data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil;
  NSDictionary *options = [parsed isKindOfClass:NSDictionary.class] ? parsed : @{};
  BOOL jpeg = [options[@"format"] isEqual:@"jpeg"];
  CGFloat quality = options[@"quality"] ? MIN(1, MAX(0, [options[@"quality"] doubleValue])) : 0.9;
  CGFloat scale = [options[@"scale"] doubleValue] > 0 ? [options[@"scale"] doubleValue] : UIScreen.mainScreen.scale;
  BOOL trim = [options[@"trim"] boolValue];
  CGFloat padding = MAX(0, [options[@"padding"] doubleValue]);
  BOOL background = options[@"background"] ? [options[@"background"] boolValue] : YES;
  BOOL base64 = [options[@"base64"] boolValue];

  CGRect area = CGRectMake(0, 0, canvasSize.width, canvasSize.height);
  if (trim) {
    if (drawing.strokes.count == 0) {
      completion(nil, @"E_EMPTY", @"nothing to trim: the canvas is empty");
      return;
    }
    area = CGRectInset(drawing.bounds, -padding, -padding);
  }
  CGSize pixels = CGSizeMake(MAX(1, round(area.size.width * scale)), MAX(1, round(area.size.height * scale)));

  dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
    __block UIImage *strokes = nil;
    // PencilKit renders ink for the current appearance, so render in light mode to keep the real colors.
    [[UITraitCollection traitCollectionWithUserInterfaceStyle:UIUserInterfaceStyleLight]
        performAsCurrentTraitCollection:^{
          strokes = [drawing imageFromRect:area scale:scale];
        }];

    UIGraphicsImageRendererFormat *format = [UIGraphicsImageRendererFormat preferredFormat];
    format.scale = 1;
    format.opaque = jpeg;
    UIGraphicsImageRenderer *renderer = [[UIGraphicsImageRenderer alloc] initWithSize:pixels format:format];
    CGRect bounds = CGRectMake(0, 0, pixels.width, pixels.height);
    UIImage *image = [renderer imageWithActions:^(UIGraphicsImageRendererContext *context) {
      if (jpeg) {
        [UIColor.whiteColor setFill];
        [context fillRect:bounds];
      }
      if (background && CGColorGetAlpha(canvasColor.CGColor) > 0) {
        [canvasColor setFill];
        [context fillRect:bounds];
      }
      [strokes drawInRect:bounds];
    }];

    NSData *encoded = jpeg ? UIImageJPEGRepresentation(image, quality) : UIImagePNGRepresentation(image);
    NSURL *directory = [NSFileManager.defaultManager URLsForDirectory:NSCachesDirectory
                                                            inDomains:NSUserDomainMask]
                           .firstObject;
    NSString *name = [NSString stringWithFormat:@"inkpad-%@.%@", NSUUID.UUID.UUIDString, jpeg ? @"jpg" : @"png"];
    NSURL *url = [directory URLByAppendingPathComponent:name];
    if (encoded == nil || ![encoded writeToURL:url atomically:YES]) {
      completion(nil, @"E_EXPORT_FAILED", @"could not write the image file");
      return;
    }
    NSMutableDictionary *result =
        [@{@"uri" : url.absoluteString, @"width" : @(pixels.width), @"height" : @(pixels.height)} mutableCopy];
    if (base64) {
      result[@"base64"] = [encoded base64EncodedStringWithOptions:0];
    }
    NSData *json = [NSJSONSerialization dataWithJSONObject:result options:0 error:nil];
    completion([[NSString alloc] initWithData:json encoding:NSUTF8StringEncoding], nil, nil);
  });
}

@end
