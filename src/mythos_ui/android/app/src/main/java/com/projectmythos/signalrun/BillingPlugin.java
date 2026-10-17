package com.projectmythos.signalrun;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClient.BillingResponseCode;
import com.android.billingclient.api.BillingClient.ProductType;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.json.JSONException;

/**
 * Google Play Billing for the Signal+ subscription (src/v2/native/billing.ts). The app only launches the purchase
 * and hands the token to the server; the server verifies it with Google, checks that it was bought for this player
 * (obfuscatedAccountId = the signed-in player id) and acknowledges it (mythos_v2/billing.py).
 */
@CapacitorPlugin(name = "Billing")
public class BillingPlugin extends Plugin implements PurchasesUpdatedListener {

    private BillingClient client;
    private PluginCall pendingPurchase;
    private final Map<String, ProductDetails> details = new HashMap<>();

    @Override
    public void load() {
        client = BillingClient.newBuilder(getContext())
            .setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection()
            .build();
    }

    private void whenReady(PluginCall call, Runnable then) {
        if (client.isReady()) {
            then.run();
            return;
        }
        client.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult result) {
                if (result.getResponseCode() == BillingResponseCode.OK) then.run();
                else call.reject("billing unavailable", String.valueOf(result.getResponseCode()));
            }

            @Override
            public void onBillingServiceDisconnected() {}
        });
    }

    /** {productIds: string[]} → {products: [{productId, title, price, offerToken}]} */
    @PluginMethod
    public void products(PluginCall call) {
        JSArray ids = call.getArray("productIds");
        List<QueryProductDetailsParams.Product> wanted = new ArrayList<>();
        try {
            for (String id : ids == null ? new ArrayList<String>() : ids.<String>toList()) {
                wanted.add(QueryProductDetailsParams.Product.newBuilder().setProductId(id).setProductType(ProductType.SUBS).build());
            }
        } catch (JSONException e) {
            call.reject("bad productIds");
            return;
        }
        if (wanted.isEmpty()) {
            call.reject("no productIds");
            return;
        }
        whenReady(call, () -> {
            QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder().setProductList(wanted).build();
            client.queryProductDetailsAsync(params, (result, found) -> {
                if (result.getResponseCode() != BillingResponseCode.OK) {
                    call.reject("query failed", String.valueOf(result.getResponseCode()));
                    return;
                }
                JSArray out = new JSArray();
                for (ProductDetails d : found.getProductDetailsList()) {
                    List<ProductDetails.SubscriptionOfferDetails> offers = d.getSubscriptionOfferDetails();
                    if (offers == null || offers.isEmpty()) continue;
                    ProductDetails.SubscriptionOfferDetails offer = offers.get(0);
                    List<ProductDetails.PricingPhase> phases = offer.getPricingPhases().getPricingPhaseList();
                    details.put(d.getProductId(), d);
                    JSObject item = new JSObject();
                    item.put("productId", d.getProductId());
                    item.put("title", d.getName());
                    item.put("price", phases.isEmpty() ? "" : phases.get(phases.size() - 1).getFormattedPrice());
                    item.put("offerToken", offer.getOfferToken());
                    out.put(item);
                }
                JSObject ret = new JSObject();
                ret.put("products", out);
                call.resolve(ret);
            });
        });
    }

    /** {productId, accountId} → {purchaseToken, productId, pending} once Play reports the purchase. */
    @PluginMethod
    public void purchase(PluginCall call) {
        String productId = call.getString("productId", "");
        String accountId = call.getString("accountId", "");
        ProductDetails d = details.get(productId);
        if (d == null || d.getSubscriptionOfferDetails() == null || d.getSubscriptionOfferDetails().isEmpty()) {
            call.reject("unknown product");
            return;
        }
        if (pendingPurchase != null) {
            call.reject("purchase in progress");
            return;
        }
        whenReady(call, () -> {
            List<BillingFlowParams.ProductDetailsParams> list = new ArrayList<>();
            list.add(BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(d)
                .setOfferToken(d.getSubscriptionOfferDetails().get(0).getOfferToken())
                .build());
            BillingFlowParams params = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(list)
                .setObfuscatedAccountId(accountId)
                .build();
            pendingPurchase = call;
            BillingResult result = client.launchBillingFlow(getActivity(), params);
            if (result.getResponseCode() != BillingResponseCode.OK) {
                pendingPurchase = null;
                call.reject("launch failed", String.valueOf(result.getResponseCode()));
            }
        });
    }

    @Override
    public void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        PluginCall call = pendingPurchase;
        pendingPurchase = null;
        if (call == null) return;
        int code = result.getResponseCode();
        if (code == BillingResponseCode.OK && purchases != null && !purchases.isEmpty()) {
            Purchase p = purchases.get(0);
            JSObject ret = new JSObject();
            ret.put("purchaseToken", p.getPurchaseToken());
            ret.put("productId", p.getProducts().isEmpty() ? "" : p.getProducts().get(0));
            ret.put("pending", p.getPurchaseState() == Purchase.PurchaseState.PENDING);
            call.resolve(ret);
        } else if (code == BillingResponseCode.USER_CANCELED) {
            call.reject("canceled", "canceled");
        } else {
            call.reject("purchase failed", String.valueOf(code));
        }
    }

    /** → {purchases: [{purchaseToken, productId}]}: the subscriptions this Play account owns (restore). */
    @PluginMethod
    public void owned(PluginCall call) {
        whenReady(call, () -> {
            QueryPurchasesParams params = QueryPurchasesParams.newBuilder().setProductType(ProductType.SUBS).build();
            client.queryPurchasesAsync(params, (result, purchases) -> {
                if (result.getResponseCode() != BillingResponseCode.OK) {
                    call.reject("query failed", String.valueOf(result.getResponseCode()));
                    return;
                }
                JSArray out = new JSArray();
                for (Purchase p : purchases) {
                    if (p.getPurchaseState() != Purchase.PurchaseState.PURCHASED) continue;
                    JSObject item = new JSObject();
                    item.put("purchaseToken", p.getPurchaseToken());
                    item.put("productId", p.getProducts().isEmpty() ? "" : p.getProducts().get(0));
                    out.put(item);
                }
                JSObject ret = new JSObject();
                ret.put("purchases", out);
                call.resolve(ret);
            });
        });
    }
}
