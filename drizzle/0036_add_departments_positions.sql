-- Migración manual: Agregar tablas departments y positions con FK en employees
-- Fecha: 2026-02-08
-- Descripción: Implementar correlaciones de datos (FASE 178 - Auditoría)

-- Paso 1: Crear tabla departments
CREATE TABLE `departments` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `code` varchar(50),
  `managerId` int,
  `isActive` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `departments_id` PRIMARY KEY(`id`),
  CONSTRAINT `departments_name_unique` UNIQUE(`name`),
  CONSTRAINT `departments_code_unique` UNIQUE(`code`)
);

-- Paso 2: Crear tabla positions
CREATE TABLE `positions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `code` varchar(50),
  `departmentId` int,
  `level` enum('executive','management','supervisor','specialist','entry'),
  `isActive` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `positions_id` PRIMARY KEY(`id`),
  CONSTRAINT `positions_code_unique` UNIQUE(`code`)
);

-- Paso 3: Agregar FK de positions a departments
ALTER TABLE `positions` 
  ADD CONSTRAINT `positions_departmentId_departments_id_fk` 
  FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Paso 4: Agregar nuevas columnas departmentId y positionId a employees
ALTER TABLE `employees` 
  ADD COLUMN `departmentId` int AFTER `employeeNumber`,
  ADD COLUMN `positionId` int AFTER `departmentId`;

-- Paso 5: Migrar datos existentes de varchar a FK
-- Primero, poblar tabla departments con valores únicos existentes
INSERT INTO `departments` (`name`, `code`, `isActive`)
SELECT DISTINCT 
  `department` as name,
  UPPER(LEFT(`department`, 3)) as code,
  true as isActive
FROM `employees`
WHERE `department` IS NOT NULL AND `department` != '';

-- Poblar tabla positions con valores únicos existentes
INSERT INTO `positions` (`title`, `code`, `isActive`)
SELECT DISTINCT 
  `position` as title,
  CONCAT('POS-', LPAD(ROW_NUMBER() OVER (ORDER BY `position`), 3, '0')) as code,
  true as isActive
FROM `employees`
WHERE `position` IS NOT NULL AND `position` != '';

-- Paso 6: Actualizar employees.departmentId con FK correspondiente
UPDATE `employees` e
INNER JOIN `departments` d ON e.`department` = d.`name`
SET e.`departmentId` = d.`id`
WHERE e.`department` IS NOT NULL AND e.`department` != '';

-- Actualizar employees.positionId con FK correspondiente
UPDATE `employees` e
INNER JOIN `positions` p ON e.`position` = p.`title`
SET e.`positionId` = p.`id`
WHERE e.`position` IS NOT NULL AND e.`position` != '';

-- Paso 7: Agregar constraints FK en employees
ALTER TABLE `employees`
  ADD CONSTRAINT `employees_departmentId_departments_id_fk`
  FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `employees`
  ADD CONSTRAINT `employees_positionId_positions_id_fk`
  FOREIGN KEY (`positionId`) REFERENCES `positions`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Paso 8: Crear índices de performance
CREATE INDEX `idx_employees_departmentId` ON `employees`(`departmentId`);
CREATE INDEX `idx_employees_positionId` ON `employees`(`positionId`);
CREATE INDEX `idx_positions_departmentId` ON `positions`(`departmentId`);
CREATE INDEX `idx_departments_managerId` ON `departments`(`managerId`);

-- Paso 9: (OPCIONAL) Eliminar columnas varchar antiguas después de verificar migración
-- ALTER TABLE `employees` DROP COLUMN `department`;
-- ALTER TABLE `employees` DROP COLUMN `position`;
-- NOTA: Comentado por seguridad. Descomentar después de verificar que la migración fue exitosa.
