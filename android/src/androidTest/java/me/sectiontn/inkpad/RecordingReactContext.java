package me.sectiontn.inkpad;

import android.content.Context;
import com.facebook.react.bridge.BridgeReactContext;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.uimanager.events.BatchEventDispatchedListener;
import com.facebook.react.uimanager.events.Event;
import com.facebook.react.uimanager.events.EventDispatcher;
import com.facebook.react.uimanager.events.EventDispatcherListener;
import com.facebook.react.uimanager.events.EventDispatcherProvider;
import java.util.ArrayList;
import java.util.List;

// Keeps each event payload. Java, so it can implement React Native's internal provider and read protected event data.
class RecordingReactContext extends BridgeReactContext implements EventDispatcherProvider {
  final List<ReadableMap> events = new ArrayList<>();

  private final EventDispatcher dispatcher =
      new EventDispatcher() {
        @Override
        public void dispatchEvent(Event<?> event) {
          if (event instanceof InkEvent) events.add(((InkEvent) event).getEventData());
        }

        @Override
        public void dispatchAllEvents() {}

        @Override
        public void addListener(EventDispatcherListener listener) {}

        @Override
        public void removeListener(EventDispatcherListener listener) {}

        @Override
        public void addBatchEventDispatchedListener(BatchEventDispatchedListener listener) {}

        @Override
        public void removeBatchEventDispatchedListener(BatchEventDispatchedListener listener) {}

        @Override
        public void onCatalystInstanceDestroyed() {}
      };

  RecordingReactContext(Context context) {
    super(context);
  }

  @Override
  public EventDispatcher getEventDispatcher() {
    return dispatcher;
  }
}
