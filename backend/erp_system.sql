-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Erstellungszeit: 29. Jan 2026 um 10:03
-- Server-Version: 10.4.32-MariaDB
-- PHP-Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Datenbank: `erp_system`
--

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `artikel`
--

CREATE TABLE `artikel` (
  `id` int(10) UNSIGNED NOT NULL,
  `nummer` varchar(64) NOT NULL,
  `bezeichnung` varchar(190) NOT NULL,
  `beschreibung` text DEFAULT NULL,
  `einheit` varchar(20) NOT NULL DEFAULT 'Stk',
  `einkaufspreis` decimal(12,2) NOT NULL DEFAULT 0.00,
  `einkaufspreis_vorher` decimal(12,2) NOT NULL DEFAULT 0.00,
  `verkaufspreis` decimal(12,2) NOT NULL DEFAULT 0.00,
  `verkaufspreis_vorher` decimal(12,2) NOT NULL DEFAULT 0.00,
  `mwst_satz` decimal(5,2) NOT NULL DEFAULT 20.00,
  `erstellt_am` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `artikel`
--

INSERT INTO `artikel` (`id`, `nummer`, `bezeichnung`, `beschreibung`, `einheit`, `einkaufspreis`, `einkaufspreis_vorher`, `verkaufspreis`, `verkaufspreis_vorher`, `mwst_satz`, `erstellt_am`) VALUES
(1, 'A-0001', 'Kupferrohr 15mm', 'Stangenware 5m', 'Stk', 8.90, 0.00, 15.90, 0.00, 20.00, '2025-09-10 13:45:11'),
(2, 'A-0002', 'Siphon 1 1/4\"', 'Kunststoff', 'Stk', 3.50, 0.00, 7.90, 0.00, 20.00, '2025-09-10 13:45:11'),
(3, 'A-0003', 'Therme XY-24', 'Gastherme 24kW', 'Stk', 620.00, 0.00, 980.00, 0.00, 20.00, '2025-09-10 13:45:11'),
(135, 'A-0004', 'q', 'a', 'kg', 2.00, 2.00, 2.00, 2.00, 20.00, '2026-01-23 08:54:26'),
(137, 'A-0005', 'Arbeitsstunden', '1 h', 'Stunden', 20.00, 20.00, 50.00, 50.00, 20.00, '2026-01-23 09:08:49'),
(139, 'A-0006', 'Material1', 'Material1', 'kg', 20.00, 20.00, 30.00, 30.00, 20.00, '2026-01-28 11:04:24'),
(140, 'A-0007', 'Material2', 'Material2', 'cm', 16.00, 16.00, 50.00, 50.00, 20.00, '2026-01-28 11:04:42'),
(141, 'A-0008', 'Material3', 'Material3', 'Liter', 1.00, 1.00, 2.00, 2.00, 20.00, '2026-01-28 11:04:57'),
(142, 'A-0009', 'Material4', 'Material4', 'Karton', 300.00, 300.00, 400.00, 400.00, 20.00, '2026-01-28 11:05:25');

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `benutzer`
--

CREATE TABLE `benutzer` (
  `id` int(10) UNSIGNED NOT NULL,
  `benutzername` varchar(120) NOT NULL,
  `rolle_id` tinyint(3) UNSIGNED NOT NULL,
  `passworthash` varchar(100) NOT NULL,
  `aktiv` tinyint(1) NOT NULL DEFAULT 1,
  `fehlversuche` int(6) NOT NULL,
  `erstellt_am` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `benutzer`
--

INSERT INTO `benutzer` (`id`, `benutzername`, `rolle_id`, `passworthash`, `aktiv`, `fehlversuche`, `erstellt_am`) VALUES
(8, 'aa', 1, '$2a$12$ANzA9h8f2ZMHook6fSVCneFRR9L6goZwZJMjvxU7TCR3zmZ5EACOi', 1, 0, '2026-01-23 08:35:22'),
(11, 'lager', 3, '$2b$12$R7JVmMqJtojGWKc9D0sCr.IZCnf/NzTgADxg2quXVZJCYjun3ADHi', 1, 0, '2026-01-26 07:14:04');

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `bestaende`
--

CREATE TABLE `bestaende` (
  `id` int(10) UNSIGNED NOT NULL,
  `artikel_id` int(10) UNSIGNED NOT NULL,
  `lagerort` varchar(120) NOT NULL,
  `bestand` int(11) NOT NULL DEFAULT 0,
  `mindestbestand` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `bestaende`
--

INSERT INTO `bestaende` (`id`, `artikel_id`, `lagerort`, `bestand`, `mindestbestand`) VALUES
(1, 1, 'Zentrallager', 60, 50),
(2, 2, 'Zentrallager', 303, 20),
(3, 3, 'Zentrallager', 272, 1),
(68, 135, '', 3, 0),
(70, 137, 'H', 2, 0),
(72, 139, 'Hauptlager', 0, 50),
(73, 140, 'Hauptlager', 0, 12),
(74, 141, 'Hauptlager', 0, 45),
(75, 142, 'Hauptlager', 0, 34);

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `krankenstaende`
--

CREATE TABLE `krankenstaende` (
  `id` int(10) UNSIGNED NOT NULL,
  `mitarbeiter_id` int(10) UNSIGNED NOT NULL,
  `startdatum` date NOT NULL,
  `enddatum` date NOT NULL,
  `bemerkung` varchar(255) DEFAULT NULL,
  `erstellt_am` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `krankenstaende`
--

INSERT INTO `krankenstaende` (`id`, `mitarbeiter_id`, `startdatum`, `enddatum`, `bemerkung`, `erstellt_am`) VALUES
(1, 2, '2025-09-07', '2025-09-12', 'Erkältung', '2025-09-10 13:45:11');

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `kunden`
--

CREATE TABLE `kunden` (
  `id` int(10) UNSIGNED NOT NULL,
  `firma` varchar(190) NOT NULL,
  `vorname` varchar(20) NOT NULL,
  `nachname` varchar(20) NOT NULL,
  `kontakt` varchar(190) DEFAULT NULL,
  `adresse` varchar(255) DEFAULT NULL,
  `plz` varchar(20) DEFAULT NULL,
  `ort` varchar(120) DEFAULT NULL,
  `mail` varchar(190) DEFAULT NULL,
  `telefon` varchar(60) DEFAULT NULL,
  `notizen` text DEFAULT NULL,
  `heizung` varchar(255) DEFAULT NULL,
  `heizung_datum` date DEFAULT NULL,
  `pruefungsintervall` int(11) DEFAULT NULL,
  `vorletzte_pruefung` date DEFAULT NULL,
  `letzte_pruefung` date DEFAULT NULL,
  `naechste_pruefung` date DEFAULT NULL,
  `erstellt_am` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `kunden`
--

INSERT INTO `kunden` (`id`, `firma`, `vorname`, `nachname`, `kontakt`, `adresse`, `plz`, `ort`, `mail`, `telefon`, `notizen`, `heizung`, `heizung_datum`, `pruefungsintervall`, `vorletzte_pruefung`, `letzte_pruefung`, `naechste_pruefung`, `erstellt_am`) VALUES
(1, 'Haustechnik Meier GmbH', '', '', 'Frau Meier', 'Industriestraße 12', '4020', 'Linz', 'office@meier.at', '+43 732 123456', 'Wartungsvertrag Bronze', 'm', '2026-01-22', 2, '2024-01-21', '2026-01-21', '2026-03-21', '2025-09-10 13:45:11'),
(2, 'Wohnbau Alpha AG', '', '', 'Herr König', 'Zentralallee 5', '1010', 'Wien', 'kontakt@wohn-alpha.at', '+43 1 555555', 'Wartungsvertrag Gold', NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-10 13:45:11'),
(3, 'Privatkunde Novak', '', '', 'Herr Novak', 'Hauptplatz 3', '4020', 'Linz', 'novak@example.com', '+43 660 987654', '', NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-10 13:45:11'),
(4, 'Firma Test', '', '', 'Benni', '123 Adresse 1', '1234', 'Ort', 'mail', '1234777', 'notiz 123', 'heizung', '2025-12-29', 1, '2024-01-22', '2026-01-23', '2026-02-23', '2025-12-15 19:20:32'),
(15, '', 'a', 'a', '', '', '', '', '', '', '', 'a', '2026-01-06', 12, '2024-12-30', '2026-01-21', '2027-01-21', '2026-01-21 10:55:22'),
(16, 'b', '', '', '', '', '', '', '', '', '', '', '0000-00-00', 0, '0000-00-00', '0000-00-00', NULL, '2026-01-21 11:00:27'),
(17, '', 'a', 'aa', '', '', '', '', '', '', '', '', '0000-00-00', 0, '0000-00-00', '0000-00-00', NULL, '2026-01-21 11:00:39'),
(18, '', 'as', 'bererererererer', '', 'Straße 68', '12', 'zrzrzzrr', 'r', '1', 's', 'heizung', '2008-12-30', 5, '2025-09-21', '2026-01-21', '2026-06-20', '2026-01-21 15:19:14'),
(19, '', 'Benni', 'Kadl', '', '', '', '', '', '', '', '', '2026-01-13', 1, '0000-00-00', '2026-01-15', '2026-02-15', '2026-01-23 09:11:18'),
(20, '', 'a', 'a', '', '', '', '', '', '', '', '', '0000-00-00', 0, '0000-00-00', '0000-00-00', NULL, '2026-01-24 16:04:27'),
(23, 'a', '', '', '', '', '', '', '', '', '', '', '0000-00-00', 0, '0000-00-00', '0000-00-00', NULL, '2026-01-25 12:26:03'),
(24, '', 'Benni', 'Kadl', '', 'Patzenthal 95', '2153', 'Stronsdorf', 'benjamin.kadl10@gmail.com', '06641976524', 'Notizen ...', 'Heizung 67', '2007-01-10', 12, '0000-00-00', '2025-02-12', '2026-02-12', '2026-01-26 15:01:58');

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `kundenhistorie`
--

CREATE TABLE `kundenhistorie` (
  `id` int(10) UNSIGNED NOT NULL,
  `kunde_id` int(10) UNSIGNED NOT NULL,
  `ereignis` varchar(255) NOT NULL,
  `bemerkung` text DEFAULT NULL,
  `erstellt_von` int(10) UNSIGNED DEFAULT NULL,
  `erstellt_am` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `kundenhistorie`
--

INSERT INTO `kundenhistorie` (`id`, `kunde_id`, `ereignis`, `bemerkung`, `erstellt_von`, `erstellt_am`) VALUES
(1, 1, 'Wartung', 'Wartung Heizkessel durchgeführt', NULL, '2025-09-10 13:45:11'),
(2, 2, 'Störung', 'Notdienst – Thermenstörung behoben', NULL, '2025-09-10 13:45:11'),
(3, 1, 'Angebot', 'Angebot über Austausch Umwälzpumpe gesendet', NULL, '2025-09-10 13:45:11');

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `lagerbewegungen`
--

CREATE TABLE `lagerbewegungen` (
  `id` int(10) UNSIGNED NOT NULL,
  `artikel_id` int(10) UNSIGNED NOT NULL,
  `benutzer_id` int(10) UNSIGNED DEFAULT NULL,
  `typ` enum('wareneingang','warenausgang','korrektur') NOT NULL,
  `menge` int(11) NOT NULL,
  `lagerort` varchar(120) NOT NULL,
  `bemerkung` varchar(255) DEFAULT NULL,
  `erstellt_am` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `lagerbewegungen`
--

INSERT INTO `lagerbewegungen` (`id`, `artikel_id`, `benutzer_id`, `typ`, `menge`, `lagerort`, `bemerkung`, `erstellt_am`) VALUES
(1, 1, NULL, 'wareneingang', 120, 'Zentrallager', 'Initiale Befüllung', '2025-09-10 13:45:11'),
(2, 2, NULL, 'wareneingang', 12, 'Zentrallager', 'Initiale Befüllung', '2025-09-10 13:45:11'),
(3, 3, NULL, 'wareneingang', 2, 'Zentrallager', 'Initiale Befüllung', '2025-09-10 13:45:11'),
(7, 1, NULL, 'wareneingang', 12, 'Hauptlager', 'Test11', '2025-11-12 10:07:27'),
(8, 1, NULL, 'wareneingang', 12, 'Hauptlager', 'Test11', '2025-11-12 10:09:54'),
(9, 1, NULL, 'wareneingang', 12, 'Hauptlager', 'Test11', '2025-11-12 10:10:25'),
(10, 1, NULL, 'wareneingang', 12, 'Hauptlager', 'Test11', '2025-11-12 10:10:38'),
(17, 1, NULL, 'wareneingang', 1, 'Hauptlager', NULL, '2025-11-13 07:39:14'),
(18, 1, NULL, 'wareneingang', 1, 'Hauptlager', 'Testneu', '2025-11-13 07:46:07'),
(19, 1, NULL, 'warenausgang', 70, 'Hauptlager', 'Testausgang', '2025-11-13 07:46:41'),
(47, 1, NULL, 'warenausgang', 30, 'Hauptlager', NULL, '2026-01-14 10:33:37'),
(48, 3, NULL, 'wareneingang', 1222, 'Lager2', '1', '2026-01-14 18:26:40'),
(49, 3, NULL, 'warenausgang', 1223, 'Hauptlager', NULL, '2026-01-14 18:26:55'),
(50, 3, NULL, 'warenausgang', 1, 'Hauptlager', NULL, '2026-01-14 20:36:57'),
(51, 3, NULL, 'wareneingang', 100, 'Hauptlager', '1', '2026-01-14 21:21:33'),
(52, 3, NULL, 'wareneingang', 12, 'Hauptlager', '1', '2026-01-14 21:21:54'),
(53, 2, NULL, 'warenausgang', 12, 'Hauptlager', '1', '2026-01-14 21:37:30'),
(54, 2, NULL, 'wareneingang', 100, 'Hauptlager', NULL, '2026-01-14 21:37:40'),
(55, 3, NULL, 'wareneingang', 34, 'Hauptlager', NULL, '2026-01-14 21:53:20'),
(56, 3, NULL, 'wareneingang', 150, 'Hauptlager', NULL, '2026-01-14 21:53:38'),
(57, 3, NULL, 'warenausgang', 12, 'Hauptlager', NULL, '2026-01-14 22:11:11'),
(58, 3, NULL, 'warenausgang', 12, 'Hauptlager', NULL, '2026-01-14 22:11:25'),
(59, 2, NULL, 'wareneingang', 1, 'Hauptlager', NULL, '2026-01-15 07:57:15'),
(60, 2, NULL, 'warenausgang', 1, 'Hauptlager', NULL, '2026-01-15 07:58:30'),
(61, 2, NULL, 'wareneingang', 1, 'Hauptlager', NULL, '2026-01-15 07:58:44'),
(62, 2, NULL, 'wareneingang', 1, 'Hauptlager', NULL, '2026-01-15 07:58:51'),
(63, 2, NULL, 'wareneingang', 1, 'Hauptlager', NULL, '2026-01-15 07:59:21'),
(64, 2, NULL, 'wareneingang', 200, 'Hauptlager', NULL, '2026-01-15 08:17:33'),
(65, 1, NULL, 'warenausgang', 10, 'Hauptlager', NULL, '2026-01-21 11:53:55'),
(66, 135, NULL, 'wareneingang', 1, 'Hauptlager', NULL, '2026-01-23 09:00:13'),
(67, 135, NULL, 'wareneingang', 1, 'Hauptlager', NULL, '2026-01-23 09:00:22'),
(68, 135, NULL, 'wareneingang', 1, 'Hauptlager', NULL, '2026-01-23 09:02:26'),
(69, 137, NULL, 'wareneingang', 2, 'Hauptlager', NULL, '2026-01-23 09:09:13');

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `mitarbeiter`
--

CREATE TABLE `mitarbeiter` (
  `id` int(10) UNSIGNED NOT NULL,
  `vorname` varchar(100) NOT NULL,
  `nachname` varchar(100) NOT NULL,
  `adresse` varchar(255) DEFAULT NULL,
  `plz` varchar(20) DEFAULT NULL,
  `ort` varchar(120) DEFAULT NULL,
  `iban` varchar(30) NOT NULL,
  `vs_nummer` varchar(15) NOT NULL,
  `email` varchar(190) DEFAULT NULL,
  `telefon` varchar(60) DEFAULT NULL,
  `rolle_id` tinyint(3) UNSIGNED NOT NULL,
  `erstellt_am` timestamp NOT NULL DEFAULT current_timestamp(),
  `benutzer_id` int(10) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `mitarbeiter`
--

INSERT INTO `mitarbeiter` (`id`, `vorname`, `nachname`, `adresse`, `plz`, `ort`, `iban`, `vs_nummer`, `email`, `telefon`, `rolle_id`, `erstellt_am`, `benutzer_id`) VALUES
(1, 'Lena', 'Huber', 'Musterstraße 1', '1010', 'Wien', '', '', 'lena.huber@example.com', '+43 660 1111111', 4, '2025-09-10 13:45:11', NULL),
(2, 'Markus', 'Kern', 'Baumgasse 23', '1020', 'Wien', '', '', 'markus.kern@example.com', '+43 660 2222222', 3, '2025-09-10 13:45:11', NULL),
(3, 'Sabine', 'Wallner', 'Parkweg 7', '4020', 'Linz', '', '', 'sabine.wallner@example.com', '+43 660 3333333', 2, '2025-09-10 13:45:11', NULL),
(6, 'hgf', 'gfd', '', ' ', ' ', ' ', ' ', 'lager', ' ', 3, '2026-01-26 07:14:04', 11);

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `rechnung`
--

CREATE TABLE `rechnung` (
  `id` int(10) UNSIGNED NOT NULL,
  `typ` enum('angebot','rechnung') NOT NULL DEFAULT 'angebot',
  `nummer` int(11) DEFAULT NULL,
  `rechnungsnummer` varchar(50) DEFAULT NULL,
  `kunde_id` int(10) UNSIGNED NOT NULL,
  `datum` date NOT NULL,
  `faellig_am` date DEFAULT NULL,
  `bemerkung_vor_pos` text DEFAULT NULL,
  `bem_vor_pos_anzeigen` tinyint(1) NOT NULL DEFAULT 0,
  `status` enum('entwurf','offen','bezahlt','storniert') NOT NULL DEFAULT 'entwurf',
  `netto_summe` decimal(12,2) NOT NULL DEFAULT 0.00,
  `mwst_summe` decimal(12,2) NOT NULL DEFAULT 0.00,
  `brutto_summe` decimal(12,2) NOT NULL DEFAULT 0.00,
  `bemerkung` text DEFAULT NULL,
  `bemerkung_anzeigen` tinyint(1) NOT NULL DEFAULT 0,
  `skonto` int(11) DEFAULT NULL,
  `skonto_tage` int(11) DEFAULT NULL,
  `skonto_hinzufuegen` tinyint(1) NOT NULL DEFAULT 0,
  `erstellt_von` int(10) UNSIGNED DEFAULT NULL,
  `erstellt_am` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `rechnung`
--

INSERT INTO `rechnung` (`id`, `typ`, `nummer`, `rechnungsnummer`, `kunde_id`, `datum`, `faellig_am`, `bemerkung_vor_pos`, `bem_vor_pos_anzeigen`, `status`, `netto_summe`, `mwst_summe`, `brutto_summe`, `bemerkung`, `bemerkung_anzeigen`, `skonto`, `skonto_tage`, `skonto_hinzufuegen`, `erstellt_von`, `erstellt_am`) VALUES
(106, 'rechnung', 2, '2_REC_Privatkunde-Novak', 3, '2026-01-28', '2026-02-06', NULL, 0, 'entwurf', 15.90, 3.18, 19.08, NULL, 0, NULL, NULL, 0, NULL, '2026-01-28 15:13:29'),
(107, 'rechnung', 3, '3_REC_Privatkunde-Novak', 3, '2026-01-28', '2026-02-08', NULL, 0, 'entwurf', 100.00, 20.00, 120.00, NULL, 0, NULL, NULL, 0, NULL, '2026-01-28 15:13:44'),
(109, 'rechnung', 1, '1_REC_Kadl-Benni', 24, '2026-01-28', '2026-01-31', NULL, 0, 'entwurf', 31.80, 6.36, 38.16, NULL, 0, NULL, NULL, 0, NULL, '2026-01-28 16:10:49'),
(110, 'rechnung', 6, '6_REC_Wohnbau-Alpha-AG', 2, '2026-01-28', '2026-01-30', NULL, 0, 'entwurf', 15.80, 3.16, 18.96, NULL, 0, NULL, NULL, 0, NULL, '2026-01-28 16:11:21'),
(111, 'angebot', 1, '1_ANG_Wohnbau-Alpha-AG', 2, '2026-01-28', '2026-01-30', NULL, 0, 'entwurf', 15.80, 3.16, 18.96, NULL, 0, NULL, NULL, 0, NULL, '2026-01-28 16:11:37'),
(112, 'rechnung', 4, '4_REC_Wohnbau-Alpha-AG', 2, '2026-01-28', '2026-01-30', NULL, 0, 'entwurf', 15.80, 3.16, 18.96, NULL, 0, NULL, NULL, 0, NULL, '2026-01-28 21:56:51'),
(113, 'rechnung', 5, '5_REC_a', 23, '2026-01-28', '2026-01-30', NULL, 0, 'entwurf', 15.90, 3.18, 19.08, NULL, 0, NULL, NULL, 0, NULL, '2026-01-28 22:15:07'),
(114, 'angebot', 2, '2_ANG_Wohnbau-Alpha-AG', 2, '2026-01-28', '2026-01-30', NULL, 0, 'entwurf', 15.80, 3.16, 18.96, NULL, 0, NULL, NULL, 0, NULL, '2026-01-28 22:23:48');

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `rechnung_position`
--

CREATE TABLE `rechnung_position` (
  `id` int(10) UNSIGNED NOT NULL,
  `rechnung_id` int(10) UNSIGNED NOT NULL,
  `pos` int(11) NOT NULL,
  `artikel_id` int(10) UNSIGNED DEFAULT NULL,
  `beschreibung` varchar(255) NOT NULL,
  `menge` decimal(12,2) NOT NULL DEFAULT 1.00,
  `einzelpreis` decimal(12,2) NOT NULL DEFAULT 0.00,
  `bauseits` tinyint(1) NOT NULL DEFAULT 0,
  `mwst_satz` decimal(5,2) NOT NULL DEFAULT 20.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `rechnung_position`
--

INSERT INTO `rechnung_position` (`id`, `rechnung_id`, `pos`, `artikel_id`, `beschreibung`, `menge`, `einzelpreis`, `bauseits`, `mwst_satz`) VALUES
(504, 106, 1, 1, 'Kupferrohr 15mm', 1.00, 15.90, 0, 20.00),
(505, 107, 1, 137, 'Arbeitsstunden', 2.00, 50.00, 0, 20.00),
(512, 112, 1, 2, 'Siphon 1 1/4\"', 2.00, 7.90, 0, 20.00),
(513, 113, 1, 1, 'Kupferrohr 15mm', 1.00, 15.90, 0, 20.00),
(514, 109, 1, 1, 'Kupferrohr 15mm', 2.00, 15.90, 0, 20.00),
(516, 110, 1, 2, 'Siphon 1 1/4\"', 2.00, 7.90, 0, 20.00),
(517, 111, 1, 2, 'Siphon 1 1/4\"', 2.00, 7.90, 0, 20.00),
(518, 114, 1, 2, 'Siphon 1 1/4\"', 2.00, 7.90, 0, 20.00);

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `rollen`
--

CREATE TABLE `rollen` (
  `id` tinyint(3) UNSIGNED NOT NULL,
  `name` varchar(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `rollen`
--

INSERT INTO `rollen` (`id`, `name`) VALUES
(1, 'admin'),
(2, 'buchhaltung'),
(3, 'lager'),
(4, 'mitarbeiter');

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `urlaube`
--

CREATE TABLE `urlaube` (
  `id` int(10) UNSIGNED NOT NULL,
  `mitarbeiter_id` int(10) UNSIGNED NOT NULL,
  `startdatum` date NOT NULL,
  `enddatum` date NOT NULL,
  `bemerkung` varchar(255) DEFAULT NULL,
  `erstellt_am` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `urlaube`
--

INSERT INTO `urlaube` (`id`, `mitarbeiter_id`, `startdatum`, `enddatum`, `bemerkung`, `erstellt_am`) VALUES
(1, 1, '2025-08-31', '2025-09-05', 'Sommerurlaub', '2025-09-10 13:45:11'),
(2, 3, '2025-09-24', '2025-10-01', 'Herbsturlaub', '2025-09-10 13:45:11');

--
-- Indizes der exportierten Tabellen
--

--
-- Indizes für die Tabelle `artikel`
--
ALTER TABLE `artikel`
  ADD PRIMARY KEY (`id`);

--
-- Indizes für die Tabelle `benutzer`
--
ALTER TABLE `benutzer`
  ADD PRIMARY KEY (`id`),
  ADD KEY `rolle_id` (`rolle_id`);

--
-- Indizes für die Tabelle `bestaende`
--
ALTER TABLE `bestaende`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `artikel_id` (`artikel_id`,`lagerort`);

--
-- Indizes für die Tabelle `krankenstaende`
--
ALTER TABLE `krankenstaende`
  ADD PRIMARY KEY (`id`),
  ADD KEY `mitarbeiter_id` (`mitarbeiter_id`);

--
-- Indizes für die Tabelle `kunden`
--
ALTER TABLE `kunden`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_kunden_firma` (`firma`);

--
-- Indizes für die Tabelle `kundenhistorie`
--
ALTER TABLE `kundenhistorie`
  ADD PRIMARY KEY (`id`),
  ADD KEY `kunde_id` (`kunde_id`),
  ADD KEY `erstellt_von` (`erstellt_von`);

--
-- Indizes für die Tabelle `lagerbewegungen`
--
ALTER TABLE `lagerbewegungen`
  ADD PRIMARY KEY (`id`),
  ADD KEY `artikel_id` (`artikel_id`),
  ADD KEY `benutzer_id` (`benutzer_id`);

--
-- Indizes für die Tabelle `mitarbeiter`
--
ALTER TABLE `mitarbeiter`
  ADD PRIMARY KEY (`id`),
  ADD KEY `rolle_id` (`rolle_id`);

--
-- Indizes für die Tabelle `rechnung`
--
ALTER TABLE `rechnung`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_typ_nummer` (`typ`,`nummer`),
  ADD UNIQUE KEY `uniq_typ_rechnungsnummer` (`typ`,`rechnungsnummer`),
  ADD KEY `kunde_id` (`kunde_id`),
  ADD KEY `erstellt_von` (`erstellt_von`),
  ADD KEY `idx_rechnung_status` (`status`);

--
-- Indizes für die Tabelle `rechnung_position`
--
ALTER TABLE `rechnung_position`
  ADD PRIMARY KEY (`id`),
  ADD KEY `rechnung_id` (`rechnung_id`),
  ADD KEY `artikel_id` (`artikel_id`);

--
-- Indizes für die Tabelle `rollen`
--
ALTER TABLE `rollen`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indizes für die Tabelle `urlaube`
--
ALTER TABLE `urlaube`
  ADD PRIMARY KEY (`id`),
  ADD KEY `mitarbeiter_id` (`mitarbeiter_id`);

--
-- AUTO_INCREMENT für exportierte Tabellen
--

--
-- AUTO_INCREMENT für Tabelle `artikel`
--
ALTER TABLE `artikel`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=143;

--
-- AUTO_INCREMENT für Tabelle `benutzer`
--
ALTER TABLE `benutzer`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT für Tabelle `bestaende`
--
ALTER TABLE `bestaende`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=76;

--
-- AUTO_INCREMENT für Tabelle `krankenstaende`
--
ALTER TABLE `krankenstaende`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT für Tabelle `kunden`
--
ALTER TABLE `kunden`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT für Tabelle `kundenhistorie`
--
ALTER TABLE `kundenhistorie`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT für Tabelle `lagerbewegungen`
--
ALTER TABLE `lagerbewegungen`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=71;

--
-- AUTO_INCREMENT für Tabelle `mitarbeiter`
--
ALTER TABLE `mitarbeiter`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT für Tabelle `rechnung`
--
ALTER TABLE `rechnung`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=115;

--
-- AUTO_INCREMENT für Tabelle `rechnung_position`
--
ALTER TABLE `rechnung_position`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=519;

--
-- AUTO_INCREMENT für Tabelle `urlaube`
--
ALTER TABLE `urlaube`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints der exportierten Tabellen
--

--
-- Constraints der Tabelle `benutzer`
--
ALTER TABLE `benutzer`
  ADD CONSTRAINT `benutzer_ibfk_1` FOREIGN KEY (`rolle_id`) REFERENCES `rollen` (`id`);

--
-- Constraints der Tabelle `bestaende`
--
ALTER TABLE `bestaende`
  ADD CONSTRAINT `bestaende_ibfk_1` FOREIGN KEY (`artikel_id`) REFERENCES `artikel` (`id`) ON DELETE CASCADE;

--
-- Constraints der Tabelle `krankenstaende`
--
ALTER TABLE `krankenstaende`
  ADD CONSTRAINT `krankenstaende_ibfk_1` FOREIGN KEY (`mitarbeiter_id`) REFERENCES `mitarbeiter` (`id`) ON DELETE CASCADE;

--
-- Constraints der Tabelle `kundenhistorie`
--
ALTER TABLE `kundenhistorie`
  ADD CONSTRAINT `kundenhistorie_ibfk_1` FOREIGN KEY (`kunde_id`) REFERENCES `kunden` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `kundenhistorie_ibfk_2` FOREIGN KEY (`erstellt_von`) REFERENCES `benutzer` (`id`);

--
-- Constraints der Tabelle `lagerbewegungen`
--
ALTER TABLE `lagerbewegungen`
  ADD CONSTRAINT `lagerbewegungen_ibfk_1` FOREIGN KEY (`artikel_id`) REFERENCES `artikel` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `lagerbewegungen_ibfk_2` FOREIGN KEY (`benutzer_id`) REFERENCES `benutzer` (`id`);

--
-- Constraints der Tabelle `mitarbeiter`
--
ALTER TABLE `mitarbeiter`
  ADD CONSTRAINT `mitarbeiter_ibfk_1` FOREIGN KEY (`rolle_id`) REFERENCES `rollen` (`id`);

--
-- Constraints der Tabelle `rechnung`
--
ALTER TABLE `rechnung`
  ADD CONSTRAINT `rechnung_ibfk_1` FOREIGN KEY (`kunde_id`) REFERENCES `kunden` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `rechnung_ibfk_2` FOREIGN KEY (`erstellt_von`) REFERENCES `benutzer` (`id`);

--
-- Constraints der Tabelle `rechnung_position`
--
ALTER TABLE `rechnung_position`
  ADD CONSTRAINT `rechnung_position_ibfk_1` FOREIGN KEY (`rechnung_id`) REFERENCES `rechnung` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `rechnung_position_ibfk_2` FOREIGN KEY (`artikel_id`) REFERENCES `artikel` (`id`);

--
-- Constraints der Tabelle `urlaube`
--
ALTER TABLE `urlaube`
  ADD CONSTRAINT `urlaube_ibfk_1` FOREIGN KEY (`mitarbeiter_id`) REFERENCES `mitarbeiter` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
