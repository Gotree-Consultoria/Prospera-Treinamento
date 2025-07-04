package com.prosperatreinamentos.prosperaTreinamentos;

import org.springframework.boot.SpringApplication;

public class TestProsperaTreinamentosApplication {

	public static void main(String[] args) {
		SpringApplication.from(ProsperaTreinamentosApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
