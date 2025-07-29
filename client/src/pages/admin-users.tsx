
import AdminUserManagement from "@/components/admin-user-management";
import { ProtectedPage } from "@/components/protected-page";

export default function AdminUsers() {
  return (
    <ProtectedPage resource="users" action="read_write">
      <AdminUserManagement />
    </ProtectedPage>
  );
}
