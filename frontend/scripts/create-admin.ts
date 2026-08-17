import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const adminFullName = process.env.ADMIN_FULL_NAME;

if (!supabaseUrl || !serviceRoleKey || !adminEmail || !adminPassword || !adminFullName) {
  console.error(
    'Faltan variables de entorno. Se requieren: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FULL_NAME'
  );
  process.exit(1);
}

async function main() {
  const supabase = createClient(supabaseUrl as string, serviceRoleKey as string);

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: adminEmail as string,
    password: adminPassword as string,
    email_confirm: true,
  });

  if (createError || !created.user) {
    console.error('No se pudo crear el usuario en Supabase Auth:', createError?.message);
    process.exit(1);
  }

  const { error: profileError } = await supabase
    .from('admin_profile')
    .insert({ id: created.user.id, full_name: adminFullName as string });

  if (profileError) {
    console.error('Usuario creado en Auth pero fallo al insertar en admin_profile:', profileError.message);
    process.exit(1);
  }

  console.log(`Admin creado: ${adminEmail} (${created.user.id})`);
}

main();
