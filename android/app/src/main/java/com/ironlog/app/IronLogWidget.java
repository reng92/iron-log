package com.ironlog.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import java.util.Locale;

/** Widget home screen: acqua di oggi (+borraccia / +250) e kcal di oggi. */
public class IronLogWidget extends AppWidgetProvider {
    static final String ACTION_ADD = "com.ironlog.app.WIDGET_ADD_WATER";
    static final String EXTRA_ML = "ml";

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) mgr.updateAppWidget(id, build(ctx));
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);
        if (ACTION_ADD.equals(intent.getAction())) {
            int ml = intent.getIntExtra(EXTRA_ML, 0);
            if (ml > 0) WidgetStore.addPending(ctx, ml);
            refreshAll(ctx);
        }
    }

    static void refreshAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, IronLogWidget.class));
        if (ids.length == 0) return;
        RemoteViews v = build(ctx);
        for (int id : ids) mgr.updateAppWidget(id, v);
    }

    private static PendingIntent addIntent(Context ctx, int ml, int req) {
        Intent i = new Intent(ctx, IronLogWidget.class).setAction(ACTION_ADD).putExtra(EXTRA_ML, ml);
        return PendingIntent.getBroadcast(ctx, req, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static String litri(int ml) {
        return new java.text.DecimalFormat("#.##", java.text.DecimalFormatSymbols.getInstance(Locale.ITALY)).format(ml / 1000.0) + " L";
    }

    static RemoteViews build(Context ctx) {
        SharedPreferences p = WidgetStore.prefs(ctx);
        String oggi = WidgetStore.today();
        boolean fresco = oggi.equals(p.getString("date", ""));
        int ml = WidgetStore.acquaOggi(ctx);
        int target = Math.max(1, p.getInt("target", 2000));
        int borr = Math.max(50, p.getInt("borraccia", 750));
        int kcal = fresco ? p.getInt("kcal", 0) : 0;
        int kcalTarget = p.getInt("kcalTarget", 0);

        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_ironlog);
        v.setTextViewText(R.id.w_ml, litri(ml));
        v.setTextViewText(R.id.w_target, "/ " + litri(target));
        v.setProgressBar(R.id.w_progress, 100, Math.min(100, Math.round(ml * 100f / target)), false);
        int manca = Math.max(0, target - ml);
        v.setTextViewText(R.id.w_status, manca == 0 ? "Obiettivo raggiunto ✓"
                : String.format(Locale.ITALY, "mancano %d ml · %.1f borracce", manca, manca / (float) borr));
        v.setTextViewText(R.id.w_kcal, kcalTarget > 0
                ? String.format(Locale.ITALY, "🍽 %d / %d kcal", kcal, kcalTarget)
                : String.format(Locale.ITALY, "🍽 %d kcal", kcal));
        v.setTextViewText(R.id.w_btn_borr, "+" + borr);
        v.setOnClickPendingIntent(R.id.w_btn_borr, addIntent(ctx, borr, 1));
        v.setOnClickPendingIntent(R.id.w_btn_250, addIntent(ctx, 250, 2));

        Intent open = new Intent(ctx, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        v.setOnClickPendingIntent(R.id.w_root, PendingIntent.getActivity(ctx, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        return v;
    }
}
