package com.formsync.service;

import java.util.Map;

public interface CbsConnector {
    Map<String, Object> submitTransaction(String journeyType, Map<String, Object> formData, Map<String, Object> cbsMapping);
    Map<String, Object> validateAccount(String accountNumber);
}
