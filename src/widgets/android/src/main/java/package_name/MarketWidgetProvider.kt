package com.tawangtani.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.google.gson.JsonParser

class MarketWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: android.os.Bundle
    ) {
        updateWidget(context, appWidgetManager, appWidgetId)
    }

    private fun updateWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val views = RemoteViews(context.packageName, R.layout.market_widget)
        views.setTextViewText(R.id.tv_title, "TAWANGTANI")
        views.setTextViewText(R.id.tv_city, "— · —")
        views.setTextViewText(R.id.tv_p1, "—")
        views.setTextViewText(R.id.tv_p2, "—")
        views.setTextViewText(R.id.tv_p3, "—")

        val prefs = context.getSharedPreferences(
            context.packageName + ".widgetdata",
            Context.MODE_PRIVATE
        )
        val raw = prefs.getString("widgetdata", null)
        if (raw != null) {
            try {
                val root = JsonParser.parseString(raw).asJsonObject
                val city = root.get("city")?.takeIf { !it.isJsonNull }?.asString ?: ""
                val temp = root.get("temp")?.takeIf { !it.isJsonNull }?.asString ?: ""
                views.setTextViewText(R.id.tv_city, if (city.isNotBlank()) "$city · $temp" else "— · —")
                val prices = root.getAsJsonArray("prices") ?: com.google.gson.JsonArray()
                val ids = intArrayOf(R.id.tv_p1, R.id.tv_p2, R.id.tv_p3)
                for (i in ids.indices) {
                    val text = if (i < prices.size()) {
                        val p = prices.get(i).asJsonObject
                        val name = p.get("name")?.asString ?: ""
                        val price = p.get("price")?.asString ?: ""
                        if (name.isNotBlank()) "$name  Rp$price" else ""
                    } else {
                        ""
                    }
                    views.setTextViewText(ids[i], text)
                }
            } catch (e: Exception) {
                views.setTextViewText(R.id.tv_city, "cuaca & harga" )
            }
        }

        val intent = Intent(context, MainActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}