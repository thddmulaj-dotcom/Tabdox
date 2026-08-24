package com.tadbox.apk

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

object AirtelPaymentApi {
    private const val BACKEND_BASE_URL = "https://CHANGE-ME.example.com"

    data class PaymentResult(
        val success: Boolean,
        val status: String,
        val message: String,
        val transactionId: String? = null
    )

    fun initiate(phone: String, plan: String, amount: Double): PaymentResult {
        val body = JSONObject().apply {
            put("phone", phone)
            put("plan", plan)
            put("amount", amount)
        }
        val json = postJson("$BACKEND_BASE_URL/payments/airtel", body)
        return PaymentResult(
            json.optBoolean("success"),
            json.optString("status", "UNKNOWN"),
            json.optString("message", "Réponse du serveur."),
            json.optString("transactionId").ifBlank { null }
        )
    }

    fun check(transactionId: String): PaymentResult {
        val json = getJson("$BACKEND_BASE_URL/payments/airtel/status/$transactionId")
        return PaymentResult(
            json.optBoolean("success"),
            json.optString("status", "UNKNOWN"),
            json.optString("message", "Réponse du serveur."),
            transactionId
        )
    }

    private fun postJson(url: String, body: JSONObject): JSONObject {
        val c = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 15000
            readTimeout = 30000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "application/json")
        }
        return try {
            c.outputStream.use { it.write(body.toString().toByteArray()) }
            val stream = if (c.responseCode in 200..299) c.inputStream else c.errorStream
            JSONObject(stream.bufferedReader().use { it.readText() })
        } finally { c.disconnect() }
    }

    private fun getJson(url: String): JSONObject {
        val c = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 15000
            readTimeout = 30000
            setRequestProperty("Accept", "application/json")
        }
        return try {
            val stream = if (c.responseCode in 200..299) c.inputStream else c.errorStream
            JSONObject(stream.bufferedReader().use { it.readText() })
        } finally { c.disconnect() }
    }
}
