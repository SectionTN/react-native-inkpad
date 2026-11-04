#import <Foundation/Foundation.h>

#import "INKImageExporter.h"

NS_ASSUME_NONNULL_BEGIN

@interface INKDocumentRenderer : NSObject

// Renders a stored document the way a canvas of its size exports it. The completion may run on any queue.
+ (void)renderDocument:(NSString *)documentJSON
               options:(NSString *)optionsJSON
            completion:(INKExportCompletion)completion;

@end

NS_ASSUME_NONNULL_END
