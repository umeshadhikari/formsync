package com.formsync.controller;

import com.formsync.service.ReceiptService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/receipts")
@RequiredArgsConstructor
public class ReceiptController {
    private final ReceiptService receiptService;

    @GetMapping("/{formInstanceId}")
    @PreAuthorize("hasAnyRole('MAKER','SENIOR_MAKER','CHECKER','BRANCH_MANAGER','OPS_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<Map<String, Object>> getReceipt(@PathVariable Long formInstanceId) {
        return ResponseEntity.ok(receiptService.generateReceipt(formInstanceId));
    }
}
