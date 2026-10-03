#import <PencilKit/PencilKit.h>

NS_ASSUME_NONNULL_BEGIN

typedef void (^INKExportCompletion)(NSString *_Nullable json,
                                    NSString *_Nullable errorCode,
                                    NSString *_Nullable message);

@interface INKImageExporter : NSObject

+ (void)exportDrawing:(PKDrawing *)drawing
           canvasSize:(CGSize)canvasSize
          canvasColor:(UIColor *)canvasColor
          optionsJSON:(NSString *)optionsJSON
           completion:(INKExportCompletion)completion;

@end

NS_ASSUME_NONNULL_END
