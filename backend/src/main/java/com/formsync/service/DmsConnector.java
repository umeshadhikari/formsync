package com.formsync.service;

import java.util.Map;

public interface DmsConnector {
    Map<String, Object> archiveDocument(Long formInstanceId, String journeyType, Map<String, Object> formData, Map<String, Object> metadata);
}
