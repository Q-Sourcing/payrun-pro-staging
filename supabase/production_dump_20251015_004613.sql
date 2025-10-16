SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict AysyLQs71UhcVEevBsc738HyHrQerRbZgKje57aKLkVo9hfC8zxMgCXKNRBn4od

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") VALUES
	('00000000-0000-0000-0000-000000000000', 'bcbf309e-76c3-4bc5-8b36-1f8470cdc0a6', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"nalungukevin@gmail.com","user_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","user_phone":""}}', '2025-10-11 10:11:41.527218+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ceb4dcb9-9ccb-4480-ac1e-306e5676c06f', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-11 10:13:26.479003+00', ''),
	('00000000-0000-0000-0000-000000000000', '11f54235-bf51-403a-83c7-597d94050b06', '{"action":"logout","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-10-11 10:32:35.835278+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a6d3e14e-5271-46ed-ae84-025b47e9f122', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-11 10:32:43.192633+00', ''),
	('00000000-0000-0000-0000-000000000000', '106e4fe8-e19f-4994-8d4f-2a4d8d2ea68d', '{"action":"logout","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-10-11 10:32:45.717296+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c1d821ac-8e7e-48bb-a20f-cb58a826ed42', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-11 10:32:59.767615+00', ''),
	('00000000-0000-0000-0000-000000000000', '6e0a48d1-0335-48c8-aa84-acf30b21615a', '{"action":"logout","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-10-11 10:34:59.215185+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ea88cd8a-c449-4c0f-a7ae-afb47d7f9d00', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-11 10:35:08.928141+00', ''),
	('00000000-0000-0000-0000-000000000000', '4ad11924-4831-482d-97a3-aa7a30160d89', '{"action":"logout","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-10-11 10:35:18.21575+00', ''),
	('00000000-0000-0000-0000-000000000000', '5bd8b8e8-6ab7-4ab8-8fae-eb7c9800d52f', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-11 10:48:33.65742+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f7cc585e-3ef2-4a9d-a90b-e5bf5ed2bb9f', '{"action":"token_refreshed","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-11 17:10:07.764311+00', ''),
	('00000000-0000-0000-0000-000000000000', '18e1cc66-4c71-42a2-8586-8b710e86e17a', '{"action":"token_revoked","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-11 17:10:07.790526+00', ''),
	('00000000-0000-0000-0000-000000000000', '56172663-d073-47ee-9e5a-8d5dd5a6f1d1', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-11 17:11:57.706141+00', ''),
	('00000000-0000-0000-0000-000000000000', '9fe33794-ff39-4ef2-b90d-e70db11eaa94', '{"action":"logout","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-10-11 17:12:00.216956+00', ''),
	('00000000-0000-0000-0000-000000000000', '00fb0fc2-9f83-4a47-829c-c50cdb7bfa1c', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-11 17:12:11.780819+00', ''),
	('00000000-0000-0000-0000-000000000000', '933eeb75-4819-4142-b3c3-1f825b42b1a9', '{"action":"token_refreshed","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-11 18:11:27.103182+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a8d7e745-3826-46a2-af13-8def62496f2d', '{"action":"token_revoked","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-11 18:11:27.111268+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f979bd62-3606-47eb-b9ba-1b918381ec1d', '{"action":"token_refreshed","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-11 22:38:28.679944+00', ''),
	('00000000-0000-0000-0000-000000000000', '20aaf075-90a1-453a-a78c-e356303420a7', '{"action":"token_revoked","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-11 22:38:28.707622+00', ''),
	('00000000-0000-0000-0000-000000000000', '33961116-c600-4286-a13c-9b710ed4456d', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-11 23:18:07.143495+00', ''),
	('00000000-0000-0000-0000-000000000000', '460cb500-de0c-41f1-9417-ecd976b24687', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-11 23:18:12.806226+00', ''),
	('00000000-0000-0000-0000-000000000000', '7278d682-73a1-44d8-ada2-bf3b872d8f22', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-11 23:18:18.793826+00', ''),
	('00000000-0000-0000-0000-000000000000', '4347e810-f044-449d-a5e8-47bbc4d14e44', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-11 23:18:35.565945+00', ''),
	('00000000-0000-0000-0000-000000000000', '38f96c51-c812-4185-907b-fb808b06dc27', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-11 23:18:42.3926+00', ''),
	('00000000-0000-0000-0000-000000000000', '8949057d-6cf0-4a74-aa26-4cd49edb8c70', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-11 23:19:08.485499+00', ''),
	('00000000-0000-0000-0000-000000000000', '1f0a56d8-0175-4b14-8654-786dfb8b592e', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-11 23:19:16.003487+00', ''),
	('00000000-0000-0000-0000-000000000000', '5825b105-cd23-488a-8ac5-40dc2b81d69e', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-11 23:19:30.422326+00', ''),
	('00000000-0000-0000-0000-000000000000', '19c3ada4-ba83-4503-aa29-4b8c72525023', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-11 23:20:00.398361+00', ''),
	('00000000-0000-0000-0000-000000000000', '6298006c-3509-4c01-a571-fcb333215cef', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-11 23:20:07.576331+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b52d6392-a3e9-4bf4-8ccc-cbbf7eab33b7', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-11 23:20:13.484196+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e9cb06cc-5cab-4e77-9745-e79cf0ed9bd6', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-11 23:20:21.14713+00', ''),
	('00000000-0000-0000-0000-000000000000', '8ddc93ae-26a1-4adf-b004-7d1be27cbdbb', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-11 23:20:21.777066+00', ''),
	('00000000-0000-0000-0000-000000000000', '5af5793a-3b3e-44bf-a16e-ec74e1889838', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-11 23:20:38.504113+00', ''),
	('00000000-0000-0000-0000-000000000000', '709bedbb-a6da-47a0-bccc-8cadae40274a', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-11 23:20:49.770132+00', ''),
	('00000000-0000-0000-0000-000000000000', '801d7de1-aabf-4cf4-a7d6-ac0c66c8c462', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-11 23:21:05.808825+00', ''),
	('00000000-0000-0000-0000-000000000000', '5db86a91-7941-4e17-a13d-91be83384827', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-11 23:27:01.76525+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ebe9952f-6668-4a7a-84dc-37645c18fd6a', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-11 23:27:08.77236+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b15ba769-f592-472d-8518-1ddc292d29e6', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-11 23:27:37.145875+00', ''),
	('00000000-0000-0000-0000-000000000000', '133cdbf6-ce3e-4a21-8f6f-3e7d4aca9bf5', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-11 23:27:42.384915+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd9b0477c-b687-4be0-84df-ab4b016caeb4', '{"action":"token_refreshed","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-11 23:58:38.729107+00', ''),
	('00000000-0000-0000-0000-000000000000', '6c23b8e6-6b66-4596-9b84-2868738bb47e', '{"action":"token_revoked","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-11 23:58:38.740333+00', ''),
	('00000000-0000-0000-0000-000000000000', '7a6a8a52-eae7-48d2-bd44-0317c2a47c87', '{"action":"token_refreshed","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-12 05:36:52.940428+00', ''),
	('00000000-0000-0000-0000-000000000000', '43df6932-aebc-42b1-be14-9bdeea3672bf', '{"action":"token_revoked","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-12 05:36:52.97094+00', ''),
	('00000000-0000-0000-0000-000000000000', '0a39351f-187b-489b-9e57-d90ec6672816', '{"action":"logout","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-10-12 05:45:19.787344+00', ''),
	('00000000-0000-0000-0000-000000000000', '38dc80eb-9031-4f18-94b7-19c4952343f1', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-12 05:45:35.566613+00', ''),
	('00000000-0000-0000-0000-000000000000', '6e7fdc5f-c4a7-4bc8-899e-9196cc0639cb', '{"action":"token_refreshed","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-12 11:23:35.631786+00', ''),
	('00000000-0000-0000-0000-000000000000', '7d214aac-c829-463e-af7b-463c4dfc35f1', '{"action":"token_revoked","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-12 11:23:35.660134+00', ''),
	('00000000-0000-0000-0000-000000000000', '1bdf02d2-2fa3-4af1-8d61-c06b5f867492', '{"action":"token_refreshed","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-12 17:38:58.643724+00', ''),
	('00000000-0000-0000-0000-000000000000', '1706ad86-0750-40b4-9094-fca344b15ac1', '{"action":"token_revoked","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-12 17:38:58.667811+00', ''),
	('00000000-0000-0000-0000-000000000000', '0b73f884-a1ae-495f-ac42-578647f84bc0', '{"action":"token_refreshed","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-13 07:51:42.447949+00', ''),
	('00000000-0000-0000-0000-000000000000', '341a4a39-863c-4fac-bd76-f6e259e51d54', '{"action":"token_revoked","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-13 07:51:42.473119+00', ''),
	('00000000-0000-0000-0000-000000000000', '76732138-545d-49cd-9454-1b45bf379539', '{"action":"logout","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-10-13 07:53:31.303636+00', ''),
	('00000000-0000-0000-0000-000000000000', '14bd0110-f9bc-4267-9613-3aa9085875e3', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-13 08:03:46.518625+00', ''),
	('00000000-0000-0000-0000-000000000000', 'fb20912f-7715-4f70-8b89-58eacd757bde', '{"action":"logout","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-10-13 08:44:32.847353+00', ''),
	('00000000-0000-0000-0000-000000000000', '625f7608-9861-47d9-bb5e-eb85e1b83c5a', '{"action":"login","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-13 08:44:47.737374+00', ''),
	('00000000-0000-0000-0000-000000000000', '6a3ec6b1-4ab9-4433-abc3-5d7c80fe116a', '{"action":"token_refreshed","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-13 09:59:40.586335+00', ''),
	('00000000-0000-0000-0000-000000000000', '4371bd1d-4551-494b-86ad-3a275238ec4d', '{"action":"token_revoked","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-13 09:59:40.608293+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e518ba4b-d5ca-412d-8eee-3d47a2c8858e', '{"action":"token_refreshed","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-13 11:30:58.38352+00', ''),
	('00000000-0000-0000-0000-000000000000', '0325be2e-fa87-427d-875d-3228dcf7f191', '{"action":"token_revoked","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-13 11:30:58.403082+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd7351b63-8143-4b0d-8137-a181dd2939c0', '{"action":"token_refreshed","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-13 12:29:45.795425+00', ''),
	('00000000-0000-0000-0000-000000000000', '9dda9338-16cd-48ab-98cc-0f1e2a02b22f', '{"action":"token_revoked","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-13 12:29:45.810437+00', ''),
	('00000000-0000-0000-0000-000000000000', '40ccb28a-20cd-40a4-9853-02538d87f58a', '{"action":"token_refreshed","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-13 13:39:30.037588+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd91e0b02-aa3f-46c7-b6c7-7fb04c69ab23', '{"action":"token_revoked","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-13 13:39:30.057917+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a62d61bd-24af-447f-8067-810ed7a133a0', '{"action":"token_refreshed","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-13 14:38:00.997939+00', ''),
	('00000000-0000-0000-0000-000000000000', 'cd4ebbec-cd2d-4409-aa7a-df4acc55769a', '{"action":"token_revoked","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-13 14:38:01.016494+00', ''),
	('00000000-0000-0000-0000-000000000000', '4571d5ec-fd3a-4772-b98b-fba8f5bd8c4d', '{"action":"token_refreshed","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-13 18:25:57.192995+00', ''),
	('00000000-0000-0000-0000-000000000000', '8e5ce5eb-8d39-4f27-8314-273aed719d70', '{"action":"token_revoked","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-13 18:25:57.215979+00', ''),
	('00000000-0000-0000-0000-000000000000', '38fbc12c-b5af-4eb0-ada2-adc4691c16d7', '{"action":"token_refreshed","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-13 19:26:06.613462+00', ''),
	('00000000-0000-0000-0000-000000000000', '65d47b6f-a7e0-4620-92cf-7d2c66478b9a', '{"action":"token_revoked","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-13 19:26:06.623535+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c22fdc1b-bcc3-4210-b379-cfbe0a9766d7', '{"action":"token_refreshed","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-14 08:29:47.389835+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd2d39808-2d4d-428d-94d0-8d09188fb091', '{"action":"token_revoked","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-14 08:29:47.417297+00', ''),
	('00000000-0000-0000-0000-000000000000', '3da352c2-c9d1-4c7a-9803-822cd64de346', '{"action":"token_refreshed","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-14 11:27:11.52668+00', ''),
	('00000000-0000-0000-0000-000000000000', '092aec76-d441-48d8-af64-14e4b442da10', '{"action":"token_revoked","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-14 11:27:11.549084+00', ''),
	('00000000-0000-0000-0000-000000000000', 'dc07a98a-50d9-4350-a51a-14e34208c874', '{"action":"token_refreshed","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-14 12:25:24.63961+00', ''),
	('00000000-0000-0000-0000-000000000000', '1cc6e9cb-2479-40ca-b58e-a9328af444b3', '{"action":"token_revoked","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-14 12:25:24.659905+00', ''),
	('00000000-0000-0000-0000-000000000000', 'fa73eccc-e002-4131-a440-f7c67600eb2f', '{"action":"token_refreshed","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-14 13:28:05.903886+00', ''),
	('00000000-0000-0000-0000-000000000000', '4ec00edb-c820-4ee9-93ac-3510bdd26a56', '{"action":"token_revoked","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-14 13:28:05.918751+00', ''),
	('00000000-0000-0000-0000-000000000000', 'da545c41-5852-4776-8056-e2e2dae6fb86', '{"action":"token_refreshed","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-14 14:26:12.012497+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f949cb75-d5fc-4522-a303-eaa458cb5067', '{"action":"token_revoked","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-14 14:26:12.03819+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bce89ed6-9b16-4eb7-bc25-9f96d0dff93f', '{"action":"token_refreshed","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-14 15:24:44.00578+00', ''),
	('00000000-0000-0000-0000-000000000000', '56b3a0bf-85b5-4eca-9f57-58e8ecbdf10a', '{"action":"token_revoked","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-14 15:24:44.087459+00', ''),
	('00000000-0000-0000-0000-000000000000', 'cc25df7e-b5fb-4d13-9863-e86e68036349', '{"action":"token_refreshed","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-14 16:23:12.244368+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c4cf6936-8922-4a39-b430-104cf0da5d1c', '{"action":"token_revoked","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-14 16:23:12.25931+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bd5ccd82-3791-4b07-b464-633a23218b2e', '{"action":"token_refreshed","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-14 17:21:19.30942+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e3751c9f-1d05-4948-a0c5-14a3d6659c81', '{"action":"token_revoked","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-14 17:21:19.321913+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b2f47ba9-8e3f-499d-9793-0ca037d262f0', '{"action":"token_refreshed","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-14 18:19:40.273444+00', ''),
	('00000000-0000-0000-0000-000000000000', 'cdceb1ca-cb23-4cc7-a48a-b929bc4fe203', '{"action":"token_revoked","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-14 18:19:40.296002+00', ''),
	('00000000-0000-0000-0000-000000000000', 'fe43c3f3-a717-4c01-a9dc-cb2c4c5c69fc', '{"action":"token_refreshed","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-14 19:47:07.474187+00', ''),
	('00000000-0000-0000-0000-000000000000', '375a36ed-3154-48fa-8146-fdb0f18e45e6', '{"action":"token_revoked","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-14 19:47:07.500378+00', ''),
	('00000000-0000-0000-0000-000000000000', '7b00e7b5-ac03-4cc9-9409-670e5d2edb8c', '{"action":"token_refreshed","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-14 21:24:14.740134+00', ''),
	('00000000-0000-0000-0000-000000000000', 'baf64b0c-fb5d-4260-8283-7bc57338f72e', '{"action":"token_revoked","actor_id":"c235ab8b-ad54-4d99-b3c0-9499292dd23d","actor_username":"nalungukevin@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-14 21:24:14.750992+00', '');


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', 'c235ab8b-ad54-4d99-b3c0-9499292dd23d', 'authenticated', 'authenticated', 'nalungukevin@gmail.com', '$2a$10$nLmOgxEvhCw5o5mpX9IOduOx2ytY1mX2ButElCuqDoefjbXHQ6iB.', '2025-10-11 10:11:41.542391+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-10-13 08:44:47.766003+00', '{"provider": "email", "providers": ["email"]}', '{"last_name": "Kevin", "first_name": "Nalungu", "email_verified": true}', NULL, '2025-10-11 10:11:41.497779+00', '2025-10-14 21:24:14.771632+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('c235ab8b-ad54-4d99-b3c0-9499292dd23d', 'c235ab8b-ad54-4d99-b3c0-9499292dd23d', '{"sub": "c235ab8b-ad54-4d99-b3c0-9499292dd23d", "email": "nalungukevin@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2025-10-11 10:11:41.516993+00', '2025-10-11 10:11:41.517628+00', '2025-10-11 10:11:41.517628+00', 'a65bb88e-dd38-413a-841e-bac92cd45cf7');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id") VALUES
	('4a6009be-39b8-4e60-867c-0fb3dd6ffcd4', 'c235ab8b-ad54-4d99-b3c0-9499292dd23d', '2025-10-13 08:44:47.767973+00', '2025-10-14 21:24:14.781041+00', NULL, 'aal1', NULL, '2025-10-14 21:24:14.780952', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '41.84.203.194', NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('4a6009be-39b8-4e60-867c-0fb3dd6ffcd4', '2025-10-13 08:44:47.832686+00', '2025-10-13 08:44:47.832686+00', 'password', 'c8b475da-7117-4822-bb84-089dcaf0cb60');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 44, 'qvfw7tf2sinq', 'c235ab8b-ad54-4d99-b3c0-9499292dd23d', true, '2025-10-13 18:25:57.241292+00', '2025-10-13 19:26:06.62423+00', '6kkeuvm6dvcj', '4a6009be-39b8-4e60-867c-0fb3dd6ffcd4'),
	('00000000-0000-0000-0000-000000000000', 45, 'ffrb4nvsqwyr', 'c235ab8b-ad54-4d99-b3c0-9499292dd23d', true, '2025-10-13 19:26:06.633779+00', '2025-10-14 08:29:47.41933+00', 'qvfw7tf2sinq', '4a6009be-39b8-4e60-867c-0fb3dd6ffcd4'),
	('00000000-0000-0000-0000-000000000000', 46, 'i3etfdfxfjtw', 'c235ab8b-ad54-4d99-b3c0-9499292dd23d', true, '2025-10-14 08:29:47.439084+00', '2025-10-14 11:27:11.549824+00', 'ffrb4nvsqwyr', '4a6009be-39b8-4e60-867c-0fb3dd6ffcd4'),
	('00000000-0000-0000-0000-000000000000', 47, 'hwpv5jwyibax', 'c235ab8b-ad54-4d99-b3c0-9499292dd23d', true, '2025-10-14 11:27:11.566824+00', '2025-10-14 12:25:24.662357+00', 'i3etfdfxfjtw', '4a6009be-39b8-4e60-867c-0fb3dd6ffcd4'),
	('00000000-0000-0000-0000-000000000000', 48, 'posxgqpgysyr', 'c235ab8b-ad54-4d99-b3c0-9499292dd23d', true, '2025-10-14 12:25:24.679193+00', '2025-10-14 13:28:05.920556+00', 'hwpv5jwyibax', '4a6009be-39b8-4e60-867c-0fb3dd6ffcd4'),
	('00000000-0000-0000-0000-000000000000', 49, 'aqppmfnuochj', 'c235ab8b-ad54-4d99-b3c0-9499292dd23d', true, '2025-10-14 13:28:05.940181+00', '2025-10-14 14:26:12.038899+00', 'posxgqpgysyr', '4a6009be-39b8-4e60-867c-0fb3dd6ffcd4'),
	('00000000-0000-0000-0000-000000000000', 50, 'xwimnyjz7oay', 'c235ab8b-ad54-4d99-b3c0-9499292dd23d', true, '2025-10-14 14:26:12.062843+00', '2025-10-14 15:24:44.090577+00', 'aqppmfnuochj', '4a6009be-39b8-4e60-867c-0fb3dd6ffcd4'),
	('00000000-0000-0000-0000-000000000000', 51, '3plkfb5h27px', 'c235ab8b-ad54-4d99-b3c0-9499292dd23d', true, '2025-10-14 15:24:44.114621+00', '2025-10-14 16:23:12.260168+00', 'xwimnyjz7oay', '4a6009be-39b8-4e60-867c-0fb3dd6ffcd4'),
	('00000000-0000-0000-0000-000000000000', 52, 'b2565r4ple2c', 'c235ab8b-ad54-4d99-b3c0-9499292dd23d', true, '2025-10-14 16:23:12.273581+00', '2025-10-14 17:21:19.324529+00', '3plkfb5h27px', '4a6009be-39b8-4e60-867c-0fb3dd6ffcd4'),
	('00000000-0000-0000-0000-000000000000', 53, 'xdzxaxpwnwwn', 'c235ab8b-ad54-4d99-b3c0-9499292dd23d', true, '2025-10-14 17:21:19.332978+00', '2025-10-14 18:19:40.298515+00', 'b2565r4ple2c', '4a6009be-39b8-4e60-867c-0fb3dd6ffcd4'),
	('00000000-0000-0000-0000-000000000000', 54, '3ceduv2ryi4g', 'c235ab8b-ad54-4d99-b3c0-9499292dd23d', true, '2025-10-14 18:19:40.315994+00', '2025-10-14 19:47:07.502916+00', 'xdzxaxpwnwwn', '4a6009be-39b8-4e60-867c-0fb3dd6ffcd4'),
	('00000000-0000-0000-0000-000000000000', 55, 'k7lexctcqynr', 'c235ab8b-ad54-4d99-b3c0-9499292dd23d', true, '2025-10-14 19:47:07.52539+00', '2025-10-14 21:24:14.758629+00', '3ceduv2ryi4g', '4a6009be-39b8-4e60-867c-0fb3dd6ffcd4'),
	('00000000-0000-0000-0000-000000000000', 56, 'g73mlu2mytqz', 'c235ab8b-ad54-4d99-b3c0-9499292dd23d', false, '2025-10-14 21:24:14.765497+00', '2025-10-14 21:24:14.765497+00', 'k7lexctcqynr', '4a6009be-39b8-4e60-867c-0fb3dd6ffcd4'),
	('00000000-0000-0000-0000-000000000000', 38, '2durzrvtflyg', 'c235ab8b-ad54-4d99-b3c0-9499292dd23d', true, '2025-10-13 08:44:47.792937+00', '2025-10-13 09:59:40.60965+00', NULL, '4a6009be-39b8-4e60-867c-0fb3dd6ffcd4'),
	('00000000-0000-0000-0000-000000000000', 39, '7zwf5y7avufq', 'c235ab8b-ad54-4d99-b3c0-9499292dd23d', true, '2025-10-13 09:59:40.625213+00', '2025-10-13 11:30:58.404289+00', '2durzrvtflyg', '4a6009be-39b8-4e60-867c-0fb3dd6ffcd4'),
	('00000000-0000-0000-0000-000000000000', 40, 'zblgnogloteq', 'c235ab8b-ad54-4d99-b3c0-9499292dd23d', true, '2025-10-13 11:30:58.418925+00', '2025-10-13 12:29:45.81183+00', '7zwf5y7avufq', '4a6009be-39b8-4e60-867c-0fb3dd6ffcd4'),
	('00000000-0000-0000-0000-000000000000', 41, 'a676pmozffww', 'c235ab8b-ad54-4d99-b3c0-9499292dd23d', true, '2025-10-13 12:29:45.818743+00', '2025-10-13 13:39:30.059763+00', 'zblgnogloteq', '4a6009be-39b8-4e60-867c-0fb3dd6ffcd4'),
	('00000000-0000-0000-0000-000000000000', 42, 'lsdikgkoek2g', 'c235ab8b-ad54-4d99-b3c0-9499292dd23d', true, '2025-10-13 13:39:30.075381+00', '2025-10-13 14:38:01.017179+00', 'a676pmozffww', '4a6009be-39b8-4e60-867c-0fb3dd6ffcd4'),
	('00000000-0000-0000-0000-000000000000', 43, '6kkeuvm6dvcj', 'c235ab8b-ad54-4d99-b3c0-9499292dd23d', true, '2025-10-13 14:38:01.031402+00', '2025-10-13 18:25:57.216711+00', 'lsdikgkoek2g', '4a6009be-39b8-4e60-867c-0fb3dd6ffcd4');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: benefits; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: company_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."company_settings" ("id", "company_name", "address", "phone", "email", "website", "tax_id", "logo_url", "primary_color", "secondary_color", "accent_color", "include_logo", "show_company_details", "add_confidentiality_footer", "include_generated_date", "show_page_numbers", "created_at", "updated_at") VALUES
	('96f0b768-b829-4e3b-9fca-c23518bc7ec4', 'SimplePay Solutions', NULL, NULL, NULL, NULL, NULL, NULL, '#3366CC', '#666666', '#FF6B35', true, true, true, true, true, '2025-10-04 09:37:14.618474+00', '2025-10-04 09:37:14.618474+00');


--
-- Data for Name: database_health_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."database_health_log" ("id", "check_date", "health_score", "health_status", "critical_issues_count", "total_checks", "passed_checks", "report_data") VALUES
	('bc23751b-da41-4a62-b293-2e34b4ba2428', '2025-10-14 19:04:52.329086+00', 80, '🟡 GOOD', 2, 10, 8, '{"results": ["✅ Core Tables Existence: OK (1 results)", "✅ RLS Enabled on Protected Tables: OK (1 results)", "⚠️ Assignment Validation Trigger: No data found", "⚠️ Assignment Validation Function: No data found", "✅ Employee Identification Fields: OK (1 results)", "✅ Performance Indexes: OK (1 results)", "✅ Primary Keys on Core Tables: OK (1 results)", "✅ Migration History: OK (1 results)", "✅ PayGroup ID Format Check: OK (1 results)", "✅ Edge Functions Deployment: OK (1 results)"], "timestamp": "2025-10-14T19:04:52.294Z", "critical_issues": ["⚠️ Assignment Validation Trigger: No data found", "⚠️ Assignment Validation Function: No data found"]}');


--
-- Data for Name: employee_number_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."employee_number_settings" ("id", "number_format", "default_prefix", "sequence_digits", "next_sequence", "use_department_prefix", "include_country_code", "use_employment_type", "created_at", "updated_at") VALUES
	('bd821d99-87df-4f35-9f61-cef55b4193c7', 'PREFIX-SEQUENCE', 'EMP', 3, 1, false, false, false, '2025-10-05 13:49:20.53563+00', '2025-10-05 13:49:20.53563+00'),
	('18f97046-d504-46b3-8334-6183e2e4354f', 'PREFIX-SEQUENCE', 'EMP', 3, 1, false, false, false, '2025-10-05 13:50:13.049104+00', '2025-10-05 13:50:13.049104+00'),
	('706327cd-e134-4c45-883c-b61573ee69a2', 'PREFIX-SEQUENCE', 'EMP', 3, 1, false, false, false, '2025-10-05 13:51:03.75463+00', '2025-10-05 13:51:03.75463+00');


--
-- Data for Name: pay_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."pay_groups" ("id", "name", "country", "pay_frequency", "default_tax_percentage", "description", "created_at", "updated_at", "paygroup_id") VALUES
	('b286990c-4f0e-4d5e-a1bd-ca4668276f06', 'UG Monthly Staff', 'Uganda', 'monthly', 10.00, NULL, '2025-10-01 05:06:40.447425+00', '2025-10-14 18:02:46.699542+00', 'REGP-UG-202510010506'),
	('8758755c-1e15-4086-8f9a-d9a1d383eae2', 'TEST 2', 'Uganda', 'monthly', 0.00, NULL, '2025-10-04 11:01:03.531494+00', '2025-10-14 18:02:46.699542+00', 'REGP-TEST-202510041101'),
	('8d9d3843-2beb-4ee9-bb53-f07d5ff30d78', 'Mode test tpay', 'Uganda', 'monthly', 0.00, NULL, '2025-10-06 01:58:03.371024+00', '2025-10-14 18:02:46.699542+00', 'REGP-MODE-202510060158'),
	('50ef7fce-cf8a-4819-ab30-7c6d74fa62c4', 'TEST 3', 'Uganda', 'monthly', 0.10, NULL, '2025-10-08 09:09:22.397275+00', '2025-10-14 18:02:46.699542+00', 'REGP-TEST-202510080909');


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."employees" ("id", "email", "phone", "pay_type", "pay_rate", "country", "pay_group_id", "status", "user_id", "created_at", "updated_at", "first_name", "middle_name", "last_name", "currency", "employee_type", "gender", "date_of_birth", "national_id", "tin", "social_security_number", "passport_number", "bank_name", "bank_branch", "account_number", "account_type", "department", "project", "employee_number") VALUES
	('e2610e00-3334-418a-86a6-f3a771653928', 'nalungukevin@gmail.com', '0751464000', 'salary', 50000000.00, 'Uganda', 'b286990c-4f0e-4d5e-a1bd-ca4668276f06', 'active', NULL, '2025-10-01 05:06:08.126208+00', '2025-10-06 02:06:01.011935+00', 'Kevin', 'Colin', 'Nalungu', 'UGX', 'local', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'EMP-653928'),
	('b537aa05-2ab1-4653-a4df-95e3b44c9dda', 'test@something.com', NULL, 'salary', 3600000.00, 'Uganda', 'b286990c-4f0e-4d5e-a1bd-ca4668276f06', 'active', NULL, '2025-10-02 05:51:40.86562+00', '2025-10-06 02:06:01.414677+00', 'test', 'person', 'two', 'UGX', 'local', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'EMP-4C9DDA'),
	('7cc26da1-b596-4592-9f69-4852e41914b3', 'jd23403@gmail.com', '0799999999', 'salary', 1700000.00, 'Uganda', 'b286990c-4f0e-4d5e-a1bd-ca4668276f06', 'active', NULL, '2025-10-04 07:12:01.014953+00', '2025-10-06 02:06:01.773714+00', 'John', 'Doe', 'Man', 'UGX', 'local', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'EMP-1914B3'),
	('ccf1372a-eded-47a9-bec9-6ac20951ff8d', 'testerkevin21234@gmail.com', '+2560751464000', 'salary', 20000000.00, 'Uganda', '8758755c-1e15-4086-8f9a-d9a1d383eae2', 'active', NULL, '2025-10-04 11:04:32.523304+00', '2025-10-06 02:06:02.159561+00', 'Tester', NULL, 'Two', 'UGX', 'local', 'male', '1998-11-27', 'NIN123456789', '123456789', '123456789', NULL, 'Stanbic ', 'Main', '123456789', 'savings', 'TEST 2', NULL, 'EMP-51FF8D'),
	('d8579383-da0c-4f70-b675-de7cfedfe02f', 'testkevin12345@gmail.com', '+256751464000', 'salary', 3600000.00, 'Uganda', '8d9d3843-2beb-4ee9-bb53-f07d5ff30d78', 'active', NULL, '2025-10-06 01:58:23.630697+00', '2025-10-10 15:59:19.491012+00', 'Kevin', NULL, 'Test', 'UGX', 'local', NULL, '1998-11-27', 'mefveior4545045', 'ggnrtgj545940', 'vnkjgn4k545', NULL, 'Stanbic Bank', 'Kampala', '12903895u895093', 'savings', 'Mode', NULL, 'EMP-DFE02F'),
	('6278cc9e-6e30-43d8-82dc-852270babae5', 'employeeonetest12345@gmail.com', '+256751464000', 'salary', 1700000.00, 'Uganda', '8d9d3843-2beb-4ee9-bb53-f07d5ff30d78', 'active', NULL, '2025-10-06 02:22:11.440616+00', '2025-10-10 16:00:20.012777+00', 'Employee', NULL, 'One', 'UGX', 'local', 'male', '1998-11-27', 'mefveior4545045', 'ggnrtgj545940', 'vnkjgn4k545', NULL, 'Centenary Bank', 'Kampala', '4003', 'savings', 'Mode', NULL, 'EMP-001');


--
-- Data for Name: expatriate_pay_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."expatriate_pay_groups" ("id", "paygroup_id", "name", "country", "currency", "exchange_rate_to_local", "tax_country", "notes", "created_at", "updated_at") VALUES
	('9642b2e0-03ec-46ef-8877-fb4243b26965', 'EXPG-PRIORITY-202510141410', 'Priority based SLAs', 'UG', 'USD', 3800.0000, 'UG', 'test notes', '2025-10-14 14:10:00.452262+00', '2025-10-14 14:10:00.452262+00');


--
-- Data for Name: pay_runs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."pay_runs" ("id", "pay_run_date", "pay_period_start", "pay_period_end", "pay_group_id", "status", "total_gross_pay", "total_deductions", "total_net_pay", "approved_by", "approved_at", "created_by", "created_at", "updated_at", "pay_run_id") VALUES
	('bbb73f61-9872-4e13-a7f0-acbe00c071dd', '2025-10-13', '2025-06-30', '2025-07-30', 'b286990c-4f0e-4d5e-a1bd-ca4668276f06', 'draft', 55300000.00, 23060997.80, 32239002.20, NULL, NULL, NULL, '2025-10-13 09:06:16.331845+00', '2025-10-13 09:06:18.629226+00', NULL),
	('dcd44b34-6d64-486d-b50f-4096dd44f96d', '2025-05-31', '2025-05-31', '2025-06-29', 'b286990c-4f0e-4d5e-a1bd-ca4668276f06', 'draft', 55300000.00, 23060997.80, 32239002.20, NULL, NULL, NULL, '2025-10-13 09:09:57.288438+00', '2025-10-13 09:09:59.650389+00', NULL),
	('0ed769fd-dbe0-4662-a4ef-7f4c8b95c9d1', '2025-10-05', '2025-08-31', '2025-09-29', 'b286990c-4f0e-4d5e-a1bd-ca4668276f06', 'draft', 55300000.00, 5530000.00, 49770000.00, NULL, NULL, NULL, '2025-10-05 19:07:40.327057+00', '2025-10-05 19:08:08.045132+00', NULL),
	('700a4b89-9de1-44be-9570-aee53e7304f8', '2025-10-06', '2025-08-31', '2025-09-29', '8d9d3843-2beb-4ee9-bb53-f07d5ff30d78', 'draft', 5400000.00, 2613998.80, 2786001.20, NULL, NULL, NULL, '2025-10-06 02:23:38.28315+00', '2025-10-06 02:28:05.275193+00', NULL),
	('de58440d-a059-43b5-af58-6c362a788980', '2025-10-08', '2025-08-31', '2025-09-29', '8d9d3843-2beb-4ee9-bb53-f07d5ff30d78', 'draft', 5300000.00, 530000.00, 4770000.00, NULL, NULL, NULL, '2025-10-08 12:48:24.004246+00', '2025-10-08 12:57:12.190182+00', NULL);


--
-- Data for Name: expatriate_pay_run_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: expatriate_policies; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."expatriate_policies" ("id", "country", "flat_tax_rate", "apply_flat_tax", "social_security_treatment", "social_security_reduced_rate", "exempt_lst", "exempt_nhif", "exempt_housing_levy", "housing_allowance_percent", "education_allowance_percent", "travel_allowance_percent", "created_at", "updated_at") VALUES
	('82d35d4c-dbdc-43b2-a769-d6f869a00f6f', 'Uganda', 15.00, true, 'exempt', NULL, false, false, false, 20.00, 10.00, 5.00, '2025-10-04 06:02:10.843576+00', '2025-10-04 06:02:10.843576+00'),
	('452b4af5-0a1f-45c5-929c-b79c65f3083b', 'Kenya', 18.00, true, 'exempt', NULL, false, false, false, 20.00, 10.00, 5.00, '2025-10-04 06:02:10.843576+00', '2025-10-04 06:02:10.843576+00'),
	('d652843c-ee0e-4577-ae2c-c7a7c27fad30', 'Tanzania', 15.00, true, 'exempt', NULL, false, false, false, 20.00, 10.00, 5.00, '2025-10-04 06:02:10.843576+00', '2025-10-04 06:02:10.843576+00'),
	('beff3492-8d61-4e7c-8dd6-7a974d77d7a1', 'Rwanda', 15.00, true, 'exempt', NULL, false, false, false, 20.00, 10.00, 5.00, '2025-10-04 06:02:10.843576+00', '2025-10-04 06:02:10.843576+00'),
	('bfde2e29-6cba-4efd-b6ba-794d16f3aecd', 'South Sudan', 15.00, true, 'exempt', NULL, false, false, false, 20.00, 10.00, 5.00, '2025-10-04 06:02:10.843576+00', '2025-10-04 06:02:10.843576+00');


--
-- Data for Name: lst_payment_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: lst_employee_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: pay_calculation_audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: pay_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."pay_items" ("id", "pay_run_id", "employee_id", "hours_worked", "pieces_completed", "gross_pay", "tax_deduction", "benefit_deductions", "total_deductions", "net_pay", "notes", "created_at", "updated_at", "status", "employer_contributions") VALUES
	('82d23b29-2d9d-4c75-88c3-28bda42e9ab9', 'bbb73f61-9872-4e13-a7f0-acbe00c071dd', 'e2610e00-3334-418a-86a6-f3a771653928', NULL, NULL, 50000000.00, 21401999.00, 0.00, 21401999.00, 28598001.00, NULL, '2025-10-13 09:06:18.209055+00', '2025-10-13 09:06:18.209055+00', 'draft', 120000),
	('20eb0879-87ea-48b3-b94e-5e3785b37317', 'bbb73f61-9872-4e13-a7f0-acbe00c071dd', 'b537aa05-2ab1-4653-a4df-95e3b44c9dda', NULL, NULL, 3600000.00, 1161999.40, 0.00, 1161999.40, 2438000.60, NULL, '2025-10-13 09:06:18.209055+00', '2025-10-13 09:06:18.209055+00', 'draft', 120000),
	('f5d9f7a5-26eb-4b3c-883c-b3188a28b4a6', 'bbb73f61-9872-4e13-a7f0-acbe00c071dd', '7cc26da1-b596-4592-9f69-4852e41914b3', NULL, NULL, 1700000.00, 496999.40, 0.00, 496999.40, 1203000.60, NULL, '2025-10-13 09:06:18.209055+00', '2025-10-13 09:06:18.209055+00', 'draft', 120000),
	('b9e423ea-3ff9-4d4c-b4c0-4451e63cdf4f', 'dcd44b34-6d64-486d-b50f-4096dd44f96d', 'e2610e00-3334-418a-86a6-f3a771653928', NULL, NULL, 50000000.00, 21401999.00, 0.00, 21401999.00, 28598001.00, NULL, '2025-10-13 09:09:59.200419+00', '2025-10-13 09:09:59.200419+00', 'draft', 120000),
	('67fc1903-abda-4f81-b256-b723e8d7428a', '0ed769fd-dbe0-4662-a4ef-7f4c8b95c9d1', 'e2610e00-3334-418a-86a6-f3a771653928', NULL, NULL, 50000000.00, 5000000.00, 0.00, 5000000.00, 45000000.00, NULL, '2025-10-05 19:07:41.358957+00', '2025-10-05 19:07:41.358957+00', 'draft', 0),
	('d2ca0bca-cbbc-49a9-bd78-980e8b63ec7f', '0ed769fd-dbe0-4662-a4ef-7f4c8b95c9d1', 'b537aa05-2ab1-4653-a4df-95e3b44c9dda', NULL, NULL, 3600000.00, 360000.00, 0.00, 360000.00, 3240000.00, NULL, '2025-10-05 19:07:41.358957+00', '2025-10-05 19:07:41.358957+00', 'draft', 0),
	('b4b7d66b-8ada-4caa-b54f-04c82df15179', '0ed769fd-dbe0-4662-a4ef-7f4c8b95c9d1', '7cc26da1-b596-4592-9f69-4852e41914b3', NULL, NULL, 1700000.00, 170000.00, 0.00, 170000.00, 1530000.00, NULL, '2025-10-05 19:07:41.358957+00', '2025-10-05 19:07:41.358957+00', 'draft', 0),
	('06353441-1447-4e25-b95b-291fb186346e', '700a4b89-9de1-44be-9570-aee53e7304f8', '6278cc9e-6e30-43d8-82dc-852270babae5', NULL, NULL, 1750000.00, 689499.40, 0.00, 879499.40, 870500.60, NULL, '2025-10-06 02:23:38.919786+00', '2025-10-06 02:28:04.189847+00', 'draft', 0),
	('aef94ecb-2974-45e3-96a3-2d9e5b8ae98f', '700a4b89-9de1-44be-9570-aee53e7304f8', 'd8579383-da0c-4f70-b675-de7cfedfe02f', NULL, NULL, 3650000.00, 1544499.40, 0.00, 1734499.40, 1915500.60, NULL, '2025-10-06 02:23:38.919786+00', '2025-10-06 02:28:04.761667+00', 'draft', 0),
	('1e391269-babc-44a6-bbc2-0773093ae26f', 'de58440d-a059-43b5-af58-6c362a788980', 'd8579383-da0c-4f70-b675-de7cfedfe02f', NULL, NULL, 3600000.00, 360000.00, 0.00, 360000.00, 3240000.00, NULL, '2025-10-08 12:48:24.685+00', '2025-10-08 12:48:24.685+00', 'draft', 0),
	('c83cb29a-d1d6-4108-a6ae-5c25641ca7da', 'de58440d-a059-43b5-af58-6c362a788980', '6278cc9e-6e30-43d8-82dc-852270babae5', NULL, NULL, 1700000.00, 170000.00, 0.00, 170000.00, 1530000.00, NULL, '2025-10-08 12:48:24.685+00', '2025-10-08 12:48:24.685+00', 'draft', 0),
	('1d413d38-34fa-4d43-9966-3ff226ad734f', 'dcd44b34-6d64-486d-b50f-4096dd44f96d', 'b537aa05-2ab1-4653-a4df-95e3b44c9dda', NULL, NULL, 3600000.00, 1161999.40, 0.00, 1161999.40, 2438000.60, NULL, '2025-10-13 09:09:59.200419+00', '2025-10-13 09:09:59.200419+00', 'draft', 120000),
	('bb26bd58-0a3b-4130-a332-48932a8e26bc', 'dcd44b34-6d64-486d-b50f-4096dd44f96d', '7cc26da1-b596-4592-9f69-4852e41914b3', NULL, NULL, 1700000.00, 496999.40, 0.00, 496999.40, 1203000.60, NULL, '2025-10-13 09:09:59.200419+00', '2025-10-13 09:09:59.200419+00', 'draft', 120000);


--
-- Data for Name: pay_item_custom_deductions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."pay_item_custom_deductions" ("id", "pay_item_id", "name", "amount", "created_at", "updated_at", "type") VALUES
	('e615a005-3b1c-402e-ac3e-985d49188cf4', 'b4b7d66b-8ada-4caa-b54f-04c82df15179', 'LST', 40000, '2025-10-05 19:08:07.434277+00', '2025-10-05 19:08:07.434277+00', 'deduction'),
	('f7b6fb6e-2c54-4ad5-90f1-10cb673b2fb0', '67fc1903-abda-4f81-b256-b723e8d7428a', 'LST', 40000, '2025-10-05 19:08:07.434277+00', '2025-10-05 19:08:07.434277+00', 'deduction'),
	('c7d70243-4135-48c2-aa8e-a0f95e34ef58', 'd2ca0bca-cbbc-49a9-bd78-980e8b63ec7f', 'LST', 40000, '2025-10-05 19:08:07.434277+00', '2025-10-05 19:08:07.434277+00', 'deduction'),
	('c61ad10a-5ada-41fd-b831-faf8e593221e', '06353441-1447-4e25-b95b-291fb186346e', 'LST', 40000, '2025-10-06 02:25:44.527914+00', '2025-10-06 02:25:44.527914+00', 'deduction'),
	('b42e4c18-b4ab-4fcd-bff7-7ce6c92d2eb0', 'aef94ecb-2974-45e3-96a3-2d9e5b8ae98f', 'LST', 40000, '2025-10-06 02:25:44.527914+00', '2025-10-06 02:25:44.527914+00', 'deduction'),
	('448101ca-141a-4eae-8b4f-b57c4626d283', '06353441-1447-4e25-b95b-291fb186346e', 'Birthday', 50000, '2025-10-06 02:26:30.953992+00', '2025-10-06 02:26:30.953992+00', 'deduction'),
	('fa1718e4-58a6-42f7-ae90-e0686a1790d4', 'aef94ecb-2974-45e3-96a3-2d9e5b8ae98f', 'Birthday', 50000, '2025-10-06 02:26:31.235313+00', '2025-10-06 02:26:31.235313+00', 'deduction'),
	('06cc124a-9fb2-45a1-984e-a186c2139c88', '06353441-1447-4e25-b95b-291fb186346e', 'trip', 100000, '2025-10-06 02:27:23.655303+00', '2025-10-06 02:27:23.655303+00', 'deduction'),
	('c85376fd-d202-49cd-8476-8239de54866b', 'aef94ecb-2974-45e3-96a3-2d9e5b8ae98f', 'trip', 100000, '2025-10-06 02:27:23.931627+00', '2025-10-06 02:27:23.931627+00', 'deduction'),
	('7119c7e0-a7b4-418d-876a-bd968f442e50', '06353441-1447-4e25-b95b-291fb186346e', 'incentive', 50000, '2025-10-06 02:28:03.883026+00', '2025-10-06 02:28:03.883026+00', 'benefit'),
	('f75719f9-5ad4-4bcf-a15a-26c4986ba000', 'aef94ecb-2974-45e3-96a3-2d9e5b8ae98f', 'incentive', 50000, '2025-10-06 02:28:04.465769+00', '2025-10-06 02:28:04.465769+00', 'benefit'),
	('d3feb7f9-48b8-4b85-9327-b6b91d4ccafa', 'c83cb29a-d1d6-4108-a6ae-5c25641ca7da', 'LST', 50000, '2025-10-08 12:57:11.637479+00', '2025-10-08 12:57:11.637479+00', 'deduction');


--
-- Data for Name: payslip_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: payslip_generations; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profiles" ("id", "email", "first_name", "last_name", "created_at", "updated_at", "full_name", "role") VALUES
	('c235ab8b-ad54-4d99-b3c0-9499292dd23d', 'nalungukevin@gmail.com', 'Nalungu', 'Kevin', '2025-10-11 10:11:41.484953+00', '2025-10-11 10:11:41.484953+00', NULL, NULL);


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."user_roles" ("id", "user_id", "role", "created_at") VALUES
	('98b3fd56-f8e0-4db6-a9a1-86edbf7bf139', 'c235ab8b-ad54-4d99-b3c0-9499292dd23d', 'super_admin', '2025-10-11 23:26:16+00');


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: prefixes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 56, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict AysyLQs71UhcVEevBsc738HyHrQerRbZgKje57aKLkVo9hfC8zxMgCXKNRBn4od

RESET ALL;
