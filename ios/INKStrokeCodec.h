#import <PencilKit/PencilKit.h>

#import "INKBrushes.h"

NS_ASSUME_NONNULL_BEGIN

@interface INKBrushInfo : NSObject
@property (nonatomic) INKBrushType type;
@property (nonatomic, copy) NSString *color;
@property (nonatomic) CGFloat size;
@property (nonatomic, copy) NSString *input;
@end

@interface INKDecodedDrawing : NSObject
@property (nonatomic, strong) PKDrawing *drawing;
@property (nonatomic, copy) NSDictionary<NSDate *, INKBrushInfo *> *brushes;
@end

@interface INKStrokeCodec : NSObject

+ (NSString *)encodeDrawing:(PKDrawing *)drawing
                       size:(CGSize)size
                    brushes:(NSDictionary<NSDate *, INKBrushInfo *> *)brushes;

+ (nullable INKDecodedDrawing *)decode:(NSString *)json
                             errorCode:(NSString *_Nullable *_Nonnull)errorCode
                               message:(NSString *_Nullable *_Nonnull)message;

@end

NS_ASSUME_NONNULL_END
