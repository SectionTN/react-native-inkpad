#import <PencilKit/PencilKit.h>

NS_ASSUME_NONNULL_BEGIN

typedef void (^INKExportCompletion)(NSString *_Nullable json,
                                    NSString *_Nullable errorCode,
                                    NSString *_Nullable message);

FOUNDATION_EXPORT CGRect INKFitRect(CGSize image, CGSize box, BOOL cover);

@interface INKImageExporter : NSObject

+ (void)exportDrawing:(PKDrawing *)drawing
           canvasSize:(CGSize)canvasSize
          canvasColor:(UIColor *)canvasColor
      backgroundImage:(nullable UIImage *)backgroundImage
                cover:(BOOL)cover
          optionsJSON:(NSString *)optionsJSON
           completion:(INKExportCompletion)completion;

@end

NS_ASSUME_NONNULL_END
