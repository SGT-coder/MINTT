from rest_framework import permissions

class CasePermission(permissions.BasePermission):
    """
    Custom permission for Case model.
    - Admins and managers can do everything
    - Agents can view, create, and update assigned cases
    - Customers can only view their own cases
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Allow all authenticated users to view cases
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Only agents, managers, and admins can create/update cases
        return request.user.role in ['agent', 'manager', 'admin']
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # Admins and managers can do everything
        if user.role in ['admin', 'manager']:
            return True
        
        # Agents can edit assigned cases
        if user.role == 'agent':
            return obj.assigned_to == user or obj.assigned_to is None
        
        # Customers can only view their own cases
        if user.role == 'customer':
            return obj.customer.user == user
        
        return False 