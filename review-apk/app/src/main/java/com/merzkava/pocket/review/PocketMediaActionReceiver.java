package com.merzkava.pocket.review;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public final class PocketMediaActionReceiver extends BroadcastReceiver {
    public static final String ACTION_COMMAND = "com.merzkava.pocket.action.MEDIA_COMMAND";
    public static final String EXTRA_COMMAND = "media_command";

    @Override public void onReceive(Context context, Intent intent) {
        if (intent == null || !ACTION_COMMAND.equals(intent.getAction())) return;
        PocketCriAudioRuntime.dispatchMediaCommand(
            context, intent.getStringExtra(EXTRA_COMMAND));
    }
}
