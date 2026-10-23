#import <Foundation/Foundation.h>

#import "../../../ios/INKCommandQueue.h"

static int failures = 0;

static void expect(NSArray *log, NSArray *expected, const char *name)
{
  if (![log isEqualToArray:expected]) {
    printf("FAIL %s: got %s\n", name, [[log componentsJoinedByString:@","] UTF8String]);
    failures++;
  }
}

int main(void)
{
  @autoreleasepool {
    {
      NSMutableArray *log = [NSMutableArray new];
      INKCommandQueue *queue = [INKCommandQueue new];
      [queue run:^{ [log addObject:@"clear"]; }];
      expect(log, @[ @"clear" ], "runs a command right away when nothing waits");
    }
    {
      NSMutableArray *log = [NSMutableArray new];
      INKCommandQueue *queue = [INKCommandQueue new];
      INKCommandSlot *load = [queue reserve];
      [queue run:^{ [log addObject:@"clear"]; }];
      expect(log, @[], "holds commands behind a reserved slot");
      [queue fill:load action:^{ [log addObject:@"load"]; }];
      expect(log, @[ @"load", @"clear" ], "runs held commands after the slot fills");
    }
    {
      NSMutableArray *log = [NSMutableArray new];
      INKCommandQueue *queue = [INKCommandQueue new];
      INKCommandSlot *first = [queue reserve];
      [queue run:^{ [log addObject:@"clear"]; }];
      INKCommandSlot *second = [queue reserve];
      [queue run:^{ [log addObject:@"undo"]; }];
      [queue fill:second action:^{ [log addObject:@"second"]; }];
      expect(log, @[], "waits for the first load when the second finishes first");
      [queue fill:first action:^{ [log addObject:@"first"]; }];
      expect(log, @[ @"first", @"clear", @"second", @"undo" ], "applies loads in the order they were sent");
    }
    {
      NSMutableArray *log = [NSMutableArray new];
      INKCommandQueue *queue = [INKCommandQueue new];
      INKCommandSlot *load = [queue reserve];
      [queue fill:load action:^{ [log addObject:@"load"]; }];
      [queue run:^{ [log addObject:@"redo"]; }];
      expect(log, @[ @"load", @"redo" ], "runs commands right away again once the queue drains");
    }
  }
  return failures == 0 ? 0 : 1;
}
