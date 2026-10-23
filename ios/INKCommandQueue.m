#import "INKCommandQueue.h"

@interface INKCommandSlot ()
@property (nonatomic, copy, nullable) dispatch_block_t action;
@end

@implementation INKCommandSlot
@end

@implementation INKCommandQueue {
  NSMutableArray<INKCommandSlot *> *_slots;
}

- (instancetype)init
{
  if (self = [super init]) {
    _slots = [NSMutableArray new];
  }
  return self;
}

- (void)run:(dispatch_block_t)action
{
  [self fill:[self reserve] action:action];
}

- (INKCommandSlot *)reserve
{
  INKCommandSlot *slot = [INKCommandSlot new];
  [_slots addObject:slot];
  return slot;
}

- (void)fill:(INKCommandSlot *)slot action:(dispatch_block_t)action
{
  slot.action = action;
  while (_slots.firstObject.action != nil) {
    dispatch_block_t next = _slots.firstObject.action;
    [_slots removeObjectAtIndex:0];
    next();
  }
}

@end
