import AdminUserManagement from "@/components/admin-user-management";
import { ProtectedPage } from "@/components/protected-page";

export default function AdminUsers() {
  return (
    <ProtectedPage resource="users" action="read_write">
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-gray-600">
              Manage system users and their permissions
            </p>
          </div>
        </div>
        <AdminUserManagement />
      </div>
    </ProtectedPage>
  );
}
