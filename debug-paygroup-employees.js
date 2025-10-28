// Quick script to check employees in a pay group
// Run in browser console after creating pay run

// Replace with your actual pay_group_id from the console log
const payGroupId = 'YOUR_PAY_GROUP_ID_HERE';

// Check all employees
const { data: allEmployees } = await supabase
  .from('employees')
  .select('id, first_name, last_name, status, pay_group_id')
  .eq('pay_group_id', payGroupId);

console.log('All employees in pay group:', allEmployees);

// Check active employees
const { data: activeEmployees } = await supabase
  .from('employees')
  .select('id, first_name, last_name, status, pay_group_id')
  .eq('pay_group_id', payGroupId)
  .eq('status', 'active');

console.log('Active employees in pay group:', activeEmployees);
