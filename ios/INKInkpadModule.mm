#import "INKInkpadModule.h"

#import "INKDocumentRenderer.h"

@implementation INKInkpadModule

+ (NSString *)moduleName
{
  return @"Inkpad";
}

- (void)renderImage:(NSString *)documentJson
        optionsJson:(NSString *)optionsJson
            resolve:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject
{
  [INKDocumentRenderer renderDocument:documentJson
                              options:optionsJson
                           completion:^(NSString *json, NSString *errorCode, NSString *message) {
                             if (json != nil) {
                               resolve(json);
                             } else {
                               reject(errorCode ?: @"E_EXPORT_FAILED", message ?: @"export failed", nil);
                             }
                           }];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeInkpadSpecJSI>(params);
}

@end
