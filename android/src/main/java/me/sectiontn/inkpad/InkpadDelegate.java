package me.sectiontn.inkpad;

import androidx.annotation.Nullable;
import com.facebook.react.viewmanagers.InkpadViewManagerDelegate;

// Java on purpose: a Kotlin subclass clashes with ViewManagerDelegate's @JvmName("receiveCommand") compat method.
class InkpadDelegate extends InkpadViewManagerDelegate<InkpadView, InkpadViewManager> {
  InkpadDelegate(InkpadViewManager manager) {
    super(manager);
  }

  // RN's base delegate drops border props, so they reach the canvas here.
  @Override
  public void setProperty(InkpadView view, String propName, @Nullable Object value) {
    if (!BorderProps.INSTANCE.apply(view, propName, value)) {
      super.setProperty(view, propName, value);
    }
  }
}
