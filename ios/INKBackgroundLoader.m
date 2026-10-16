#import "INKBackgroundLoader.h"

#import <ImageIO/ImageIO.h>

static const NSInteger INKMaxImageSide = 4096;
static const NSTimeInterval INKLoadTimeout = 15;

static UIImage *_Nullable INKDecodeImage(NSData *_Nullable data)
{
  if (data.length == 0) {
    return nil;
  }
  CGImageSourceRef source = CGImageSourceCreateWithData((__bridge CFDataRef)data, NULL);
  if (source == NULL) {
    return nil;
  }
  NSDictionary *options = @{
    (id)kCGImageSourceCreateThumbnailFromImageAlways : @YES,
    (id)kCGImageSourceCreateThumbnailWithTransform : @YES,
    (id)kCGImageSourceThumbnailMaxPixelSize : @(INKMaxImageSide),
    (id)kCGImageSourceShouldCacheImmediately : @YES,
  };
  CGImageRef image = CGImageSourceCreateThumbnailAtIndex(source, 0, (__bridge CFDictionaryRef)options);
  CFRelease(source);
  if (image == NULL) {
    return nil;
  }
  UIImage *result = [UIImage imageWithCGImage:image];
  CGImageRelease(image);
  return result;
}

@implementation INKBackgroundLoader

+ (void)loadURI:(NSString *)uri completion:(INKBackgroundCompletion)completion
{
  void (^finish)(NSData *, NSString *) = ^(NSData *data, NSString *reason) {
    UIImage *image = reason == nil ? INKDecodeImage(data) : nil;
    NSString *message = image != nil
        ? nil
        : [NSString stringWithFormat:@"could not load the background image %@: %@", uri,
                                     reason ?: @"the data is not an image"];
    dispatch_async(dispatch_get_main_queue(), ^{
      completion(image, message);
    });
  };

  NSURL *url = [NSURL URLWithString:uri];
  NSString *scheme = url.scheme.lowercaseString;
  if ([scheme isEqualToString:@"http"] || [scheme isEqualToString:@"https"]) {
    NSURLRequest *request = [NSURLRequest requestWithURL:url
                                             cachePolicy:NSURLRequestUseProtocolCachePolicy
                                         timeoutInterval:INKLoadTimeout];
    NSURLSessionDataTask *task = [NSURLSession.sharedSession
        dataTaskWithRequest:request
          completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
            NSInteger status = [response isKindOfClass:NSHTTPURLResponse.class]
                ? ((NSHTTPURLResponse *)response).statusCode
                : 200;
            if (error != nil) {
              finish(nil, error.localizedDescription);
            } else if (status < 200 || status > 299) {
              finish(nil, [NSString stringWithFormat:@"HTTP %ld", (long)status]);
            } else {
              dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
                finish(data, nil);
              });
            }
          }];
    [task resume];
  } else if ([scheme isEqualToString:@"file"] || [scheme isEqualToString:@"data"]) {
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
      NSError *error = nil;
      NSData *data = [NSData dataWithContentsOfURL:url options:0 error:&error];
      finish(data, data == nil ? (error.localizedDescription ?: @"no data") : nil);
    });
  } else {
    finish(nil, @"unsupported URI");
  }
}

@end
