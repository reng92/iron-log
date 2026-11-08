package com.ironlog.app;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Stato condiviso tra app (via WidgetBridgePlugin) e widget.
 * L'app scrive i valori "ufficiali" del giorno; il widget accoda le aggiunte d'acqua
 * in "pending", che l'app consuma e salva su Supabase alla prossima apertura.
 */
public class WidgetStore {
    private static final String PREFS = "ironlog_widget";

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static String today() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    /** ml mostrati = valore salvato dall'app (se è di oggi) + aggiunte dal widget non ancora sincronizzate */
    static int acquaOggi(Context c) {
        SharedPreferences p = prefs(c);
        String oggi = today();
        int base = oggi.equals(p.getString("date", "")) ? p.getInt("ml", 0) : 0;
        return base + pendingPer(c, oggi);
    }

    static int pendingPer(Context c, String data) {
        int tot = 0;
        try {
            JSONArray arr = new JSONArray(prefs(c).getString("pending", "[]"));
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.getJSONObject(i);
                if (data.equals(o.optString("date"))) tot += o.optInt("ml");
            }
        } catch (Exception ignored) {}
        return tot;
    }

    static synchronized void addPending(Context c, int ml) {
        try {
            SharedPreferences p = prefs(c);
            JSONArray arr = new JSONArray(p.getString("pending", "[]"));
            JSONObject o = new JSONObject();
            o.put("date", today());
            o.put("ml", ml);
            o.put("ora", new SimpleDateFormat("HH:mm", Locale.US).format(new Date()));
            arr.put(o);
            p.edit().putString("pending", arr.toString()).apply();
        } catch (Exception ignored) {}
    }

    static synchronized JSONArray consumePending(Context c) {
        SharedPreferences p = prefs(c);
        JSONArray arr;
        try { arr = new JSONArray(p.getString("pending", "[]")); } catch (Exception e) { arr = new JSONArray(); }
        // Il valore base include già i pending consumati: lo aggiorniamo subito
        // così il widget non "perde" ml finché l'app non manda il nuovo totale.
        String oggi = today();
        int extra = pendingPer(c, oggi);
        SharedPreferences.Editor ed = p.edit().putString("pending", "[]");
        if (oggi.equals(p.getString("date", ""))) ed.putInt("ml", p.getInt("ml", 0) + extra);
        else if (extra > 0) ed.putString("date", oggi).putInt("ml", extra);
        ed.commit();
        return arr;
    }
}
