package com.ironlog.app;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;

/** Ponte JS ↔ widget: l'app invia i dati del giorno e raccoglie le aggiunte fatte dal widget. */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        WidgetStore.prefs(getContext()).edit()
                .putString("date", call.getString("date", WidgetStore.today()))
                .putInt("ml", call.getInt("ml", 0))
                .putInt("target", call.getInt("target", 2000))
                .putInt("borraccia", call.getInt("borraccia", 750))
                .putInt("kcal", call.getInt("kcal", 0))
                .putInt("kcalTarget", call.getInt("kcalTarget", 0))
                .apply();
        IronLogWidget.refreshAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void consumePending(PluginCall call) {
        JSONArray arr = WidgetStore.consumePending(getContext());
        JSObject ret = new JSObject();
        try { ret.put("adds", new JSArray(arr.toString())); } catch (Exception e) { ret.put("adds", new JSArray()); }
        call.resolve(ret);
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        notifyListeners("resume", new JSObject());
    }
}
