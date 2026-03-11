package com.formsync.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "fs_digital_signatures")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class DigitalSignature {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "form_instance_id", nullable = false) private Long formInstanceId;
    @Column(name = "signer_type", nullable = false) private String signerType;
    @Column(name = "signer_identity", nullable = false) private String signerIdentity;
    @Column(name = "signature_svg", columnDefinition = "TEXT") private String signatureSvg;
    @Column(name = "signature_png", columnDefinition = "TEXT") private String signaturePng;
    @Column(name = "data_hash", nullable = false) private String dataHash;
    @Column(name = "device_info") private String deviceInfo;
    @Column(name = "ip_address") private String ipAddress;
    private LocalDateTime timestamp;
    @Column(name = "created_at") private LocalDateTime createdAt;

    @PrePersist protected void onCreate() { createdAt = LocalDateTime.now(); if (timestamp == null) timestamp = createdAt; }
}
