package com.formsync;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class FormsyncApplication {
    public static void main(String[] args) {
        SpringApplication.run(FormsyncApplication.class, args);
    }
}
