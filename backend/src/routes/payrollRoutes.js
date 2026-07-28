const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Apply Manager role checks to all endpoints
router.use(authenticateToken);
router.use(requireRole('MANAGER'));

// Salary Configs
router.get('/configurations', payrollController.getConfigurations);
router.post('/configurations', payrollController.updateConfiguration);

// Advances CRUD
router.get('/advances', payrollController.getAdvances);
router.post('/advances', payrollController.createAdvance);
router.put('/advances/:id', payrollController.updateAdvance);
router.delete('/advances/:id', payrollController.deleteAdvance);

// Overtime logs & approvals
router.get('/overtime', payrollController.getOvertimeRecords);
router.post('/overtime/log', payrollController.logOvertime);
router.put('/overtime/:id/approve', payrollController.approveOvertime);

// Calculations & Payroll runs
router.get('/calculate', payrollController.calculateMonthlyPayroll);
router.post('/generate', payrollController.generatePayroll);
router.get('/history', payrollController.getPayrollHistory);
router.get('/details/:id', payrollController.getPayrollDetails);

module.exports = router;
