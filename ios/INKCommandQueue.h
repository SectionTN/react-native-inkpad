#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface INKCommandSlot : NSObject
@end

// Runs view commands in the order JS sent them while some finish on another thread. Main thread only.
@interface INKCommandQueue : NSObject

- (void)run:(dispatch_block_t)action;

// Holds a place for a command that finishes later, so the ones sent after it wait.
- (INKCommandSlot *)reserve;

- (void)fill:(INKCommandSlot *)slot action:(dispatch_block_t)action;

@end

NS_ASSUME_NONNULL_END
