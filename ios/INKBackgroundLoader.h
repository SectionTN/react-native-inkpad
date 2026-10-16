#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

typedef void (^INKBackgroundCompletion)(UIImage *_Nullable image, NSString *_Nullable message);

@interface INKBackgroundLoader : NSObject

// Calls back on the main queue with the image, or nil and a message naming the URI.
+ (void)loadURI:(NSString *)uri completion:(INKBackgroundCompletion)completion;

@end

NS_ASSUME_NONNULL_END
