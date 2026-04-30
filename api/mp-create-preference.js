// api/mp-create-preference.js
// Crea una preferencia de pago Checkout Pro marketplace.
// El access_token del cumpleañero vive en server, nunca en el cliente.
// La comisión se descuenta vía marketplace_fee.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    campaignId,
    giftItemId,
    sellerUserId,
    payerName,
    payerUserId,
    isAnonymous,
    message,
    fotoUrl,
    videoUrl,
    amount,
    isMobile,
    userToken,
  } = req.body;

  if (!campaignId || !sellerUserId || !payerName || !amount) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  if (isNaN(amount) || Number(amount) < 100) {
    return res.status(400).json({ error: 'Monto inválido (mínimo $100)' });
  }

  const SUPABASE_URL  = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const APP_BASE_URL  = process.env.MP_REDIRECT_BASE || 'https://test.cumpleanitos.com';
  const DEFAULT_FEE_PCT = parseFloat(process.env.MP_PLATFORM_FEE_PCT || '10');
  const IS_PROD       = process.env.MP_ENV === 'production';

  try {
    // 0. Obtener configuración de comisión de la campaña
    const campCommissionRes = await fetch(
      `${SUPABASE_URL}/rest/v1/gift_campaigns?id=eq.${campaignId}&select=commission_enabled,commission_percentage`,
      {
        headers: {
          apikey:        SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
      }
    );
    const campCommissionData = await campCommissionRes.json();
    const campCommission = campCommissionData?.[0] || {};
    
    // Determinar FEE_PCT: si commission_enabled === false → 0%, sino usar commission_percentage de la campaña o default
    let FEE_PCT;
    if (campCommission.commission_enabled === false) {
      FEE_PCT = 0;
      console.log(`[MP Preference] Comisión DESACTIVADA para campaign ${campaignId}`);
    } else {
      FEE_PCT = Number(campCommission.commission_percentage) || DEFAULT_FEE_PCT;
      console.log(`[MP Preference] Comisión ${FEE_PCT}% para campaign ${campaignId}`);
    }

    // 1. Obtener el access_token de MP del cumpleañero desde server
    const connRes = await fetch(
      `${SUPABASE_URL}/rest/v1/mp_connections?user_id=eq.${sellerUserId}&status=eq.active&select=access_token`,
      {
        headers: {
          apikey:        SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
      }
    );
    const connData = await connRes.json();

    if (!connData || connData.length === 0 || !connData[0].access_token) {
      return res.status(400).json({
        error: 'El cumpleañero no tiene cuenta de Mercado Pago conectada',
        code:  'MP_NOT_CONNECTED',
      });
    }

    const sellerAccessToken = connData[0].access_token;

    // 2. Calcular comisión y neto
    const grossAmount      = Math.round(Number(amount) * 100) / 100;
    const feeAmount        = Math.round(grossAmount * FEE_PCT) / 100;
    const netAmount        = Math.round((grossAmount - feeAmount) * 100) / 100;

    // 3. Generar referencia externa única
    const externalRef = `CPN-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;

    // 4. Obtener info de campaña para el título
    const campRes = await fetch(
      `${SUPABASE_URL}/rest/v1/gift_campaigns?id=eq.${campaignId}&select=birthday_person_name,title`,
      {
        headers: {
          apikey:        SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
      }
    );
    const campData = await campRes.json();
    const campTitle = campData?.[0]?.title || `Cumpleaños de ${campData?.[0]?.birthday_person_name || '...'}`;

    // 5. (contribution se crea SOLO cuando MP confirme el pago via webhook — no antes)

    // 5b. Limpiar órdenes pending anteriores del mismo pagador+campaña (abandonadas)
    //     Solo borramos las que tienen más de 30 minutos y status pending sin contribution
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    await fetch(
      `${SUPABASE_URL}/rest/v1/mp_orders?campaign_id=eq.${campaignId}&status=eq.pending&contribution_id=is.null&created_at=lt.${thirtyMinAgo}`,
      {
        method: 'DELETE',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      }
    );
    const orderRes = await fetch(`${SUPABASE_URL}/rest/v1/mp_orders`, {
      method: 'POST',
      headers: {
        apikey:          SERVICE_KEY,
        Authorization:   `Bearer ${SERVICE_KEY}`,
        'Content-Type':  'application/json',
        Prefer:          'return=representation',
      },
      body: JSON.stringify({
        campaign_id:         campaignId,
        gift_item_id:        giftItemId || null,
        contribution_id:     null,
        seller_user_id:      sellerUserId,
        payer_name:          payerName,
        payer_user_id:       payerUserId || null,
        is_anonymous:        isAnonymous || false,
        message:             message || null,
        foto_url:            fotoUrl || null,
        video_url:           videoUrl || null,
        gross_amount:        grossAmount,
        platform_fee_pct:    FEE_PCT,
        platform_fee_amount: feeAmount,
        net_amount:          netAmount,
        external_reference:  externalRef,
        status:              'pending',
      }),
    });
    const orderData = await orderRes.json();
    const orderId = orderData?.[0]?.id;

    if (!orderId) {
      console.error('Error creando mp_order:', orderData);
      return res.status(500).json({ error: 'Error creando la orden interna' });
    }

    // 7. Crear preferencia en MP con el access_token del cumpleañero (marketplace)
    //
    // ESTRATEGIA DE ACREDITACIÓN INMEDIATA:
    //   - Débito y saldo MP acreditan al instante → los ponemos primero y excluimos crédito
    //   - payment_methods.excluded_payment_types: ["credit_card"] garantiza que solo entren
    //     medios que liberan fondos en el momento (débito, saldo MP, transferencia)
    //   - Si en el futuro se quiere aceptar crédito, sacar la exclusión y gestionar
    //     la demora de liberación en la UI del cumpleañero
    //
    // SPLIT:
    //   - marketplace_fee = monto EXACTO en ARS a retener para Cumpleanitos
    //   - MP primero descuenta su propia comisión del total, luego retiene marketplace_fee
    //   - El neto final que llega al cumpleañero = grossAmount − comisión_MP − marketplace_fee

    const preference = {
      items: [
        {
          id:          campaignId,
          title:       campTitle,
          description: `Aporte de ${payerName} - Cumpleañitos`,
          category_id: 'services',
          quantity:    1,
          unit_price:  grossAmount,
          currency_id: 'ARS',
        },
      ],
      payer: {
        name: payerName,
      },

      // ── Comisión de plataforma (split automático) ──────────────────────────
      marketplace_fee: feeAmount,  // Monto exacto en ARS, calculado arriba como grossAmount × FEE_PCT%

      // ── Métodos de pago: solo los que acreditan INMEDIATAMENTE ─────────────
      payment_methods: {
        excluded_payment_types: [
          { id: 'credit_card' },   // Crédito retiene fondos entre 2-14 días → excluido
          { id: 'ticket' },        // Efectivo (Rapipago/Pagofácil) → demora + sin garantía
        ],
        // Déjamos habilitados: debit_card, account_money (saldo MP), bank_transfer
        // Todos acreditan de forma instantánea en la cuenta del cumpleañero
      },

      external_reference: externalRef,
      back_urls: {
        success: `${APP_BASE_URL}/pago/exito?ref=${externalRef}`,
        pending: `${APP_BASE_URL}/pago/pendiente?ref=${externalRef}`,
        failure: `${APP_BASE_URL}/pago/error?ref=${externalRef}`,
      },
      auto_return: 'approved',
      notification_url: `${APP_BASE_URL}/api/mp-webhook`,
      statement_descriptor: 'CUMPLEANITOS',
      metadata: {
        order_id:          orderId,
        campaign_id:       campaignId,
        fee_pct:           FEE_PCT,
        fee_amount_ars:    feeAmount,
        acreditacion:      'inmediata',
      },
    };

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization:   `Bearer ${sellerAccessToken}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(preference),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok || !mpData.id) {
      console.error('MP preference error:', mpData);
      return res.status(500).json({ error: 'Error creando preferencia en Mercado Pago', detail: mpData });
    }

    // 8. Guardar preference_id e init_point en la orden
    await fetch(`${SUPABASE_URL}/rest/v1/mp_orders?id=eq.${orderId}`, {
      method: 'PATCH',
      headers: {
        apikey:          SERVICE_KEY,
        Authorization:   `Bearer ${SERVICE_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        mp_preference_id: mpData.id,
        mp_init_point:    process.env.MP_ENV === 'production' ? mpData.init_point : (mpData.sandbox_init_point || mpData.init_point),
        updated_at:       new Date().toISOString(),
      }),
    });

    return res.status(200).json({
      success:            true,
      order_id:           orderId,
      external_reference: externalRef,
      init_point:         process.env.MP_ENV === 'production' ? mpData.init_point : (mpData.sandbox_init_point || mpData.init_point),
      gross_amount:       grossAmount,
      fee_amount:         feeAmount,
      net_amount:         netAmount,
    });

  } catch (err) {
    console.error('mp-create-preference error:', err);
    return res.status(500).json({ error: 'Error interno', message: err.message });
  }
}
