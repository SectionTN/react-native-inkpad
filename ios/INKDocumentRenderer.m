#import "INKDocumentRenderer.h"

#import "INKBackgroundLoader.h"
#import "INKColor.h"
#import "INKStrokeCodec.h"

// Renders run one at a time, so a list of thumbnails holds one decoded background at a time.
static dispatch_queue_t INKRenderQueue(void)
{
  static dispatch_queue_t queue;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    queue = dispatch_queue_create(
        "me.sectiontn.inkpad.render",
        dispatch_queue_attr_make_with_qos_class(DISPATCH_QUEUE_SERIAL, QOS_CLASS_USER_INITIATED, 0));
  });
  return queue;
}

@implementation INKDocumentRenderer

+ (void)renderDocument:(NSString *)documentJSON
               options:(NSString *)optionsJSON
            completion:(INKExportCompletion)completion
{
  dispatch_async(INKRenderQueue(), ^{
    dispatch_semaphore_t done = dispatch_semaphore_create(0);
    [self render:documentJSON
         options:optionsJSON
      completion:^(NSString *json, NSString *errorCode, NSString *message) {
        completion(json, errorCode, message);
        dispatch_semaphore_signal(done);
      }];
    // The background loader calls back on the main queue, which this wait never blocks.
    dispatch_semaphore_wait(done, DISPATCH_TIME_FOREVER);
  });
}

+ (void)render:(NSString *)documentJSON options:(NSString *)optionsJSON completion:(INKExportCompletion)completion
{
  NSString *errorCode = nil;
  NSString *message = nil;
  INKDecodedDrawing *decoded = [INKStrokeCodec decode:documentJSON errorCode:&errorCode message:&message];
  if (decoded == nil) {
    completion(nil, errorCode, message);
    return;
  }
  CGSize size = decoded.size;
  if (!(size.width > 0 && size.height > 0)) {
    completion(nil, @"E_INVALID_DOCUMENT", @"size must have a positive width and height");
    return;
  }

  NSData *data = [optionsJSON dataUsingEncoding:NSUTF8StringEncoding];
  id parsed = data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil;
  NSDictionary *options = [parsed isKindOfClass:NSDictionary.class] ? parsed : @{};
  UIColor *color = INKIsHexColor(options[@"backgroundColor"]) ? INKColorFromHex(options[@"backgroundColor"])
                                                              : UIColor.clearColor;
  BOOL cover = [options[@"backgroundFit"] isEqual:@"cover"];
  void (^finish)(UIImage *) = ^(UIImage *image) {
    [INKImageExporter exportDrawing:decoded.drawing
                         canvasSize:size
                        canvasColor:color
                    backgroundImage:image
                              cover:cover
                        optionsJSON:optionsJSON
                         completion:completion];
  };

  id uri = options[@"backgroundImageUri"];
  if (![uri isKindOfClass:NSString.class] || [uri length] == 0) {
    finish(nil);
    return;
  }
  [INKBackgroundLoader loadURI:uri
                    completion:^(UIImage *image, NSString *loadMessage) {
                      if (image == nil) {
                        completion(nil, @"E_IMAGE_LOAD", loadMessage);
                        return;
                      }
                      finish(image);
                    }];
}

@end
