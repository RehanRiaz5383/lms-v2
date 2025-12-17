import { useEffect, useState, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchProfile, updateProfile, changePassword } from '../store/slices/profileSlice';
import { setUser } from '../store/slices/authSlice';
import { useToast } from '../components/ui/toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Loader2, Save, Upload, User, X } from 'lucide-react';
import { getStorageUrl, normalizeStorageUrl } from '../config/api';

const Profile = () => {
  const dispatch = useAppDispatch();
  const { profile, loading, error: profileError } = useAppSelector((state) => state.profile);
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const { success, error: showError } = useToast();

  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({
    name: '',
    first_name: '',
    last_name: '',
    email: '',
    contact_no: '',
    emergency_contact_no: '',
    address: '',
    country: '',
    city: '',
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const isUpdatingRef = useRef(false);

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
  });

  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  useEffect(() => {
    // Only update form data if we're not currently updating and profile exists
    if (profile && !isUpdatingRef.current) {
      setProfileData({
        name: profile.name || '',
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        contact_no: profile.contact_no || '',
        emergency_contact_no: profile.emergency_contact_no || '',
        address: profile.address || '',
        country: profile.country || '',
        city: profile.city || '',
      });
      
      // Set profile picture preview if available and no new picture selected
      if (!profilePicture && (profile.picture_url || profile.picture)) {
        let pictureUrl = profile.picture_url || (profile.picture ? getStorageUrl(profile.picture) : null);
        // Normalize URL to ensure it uses /load-storage/ instead of /storage/
        if (pictureUrl) {
          pictureUrl = normalizeStorageUrl(pictureUrl);
        }
        setProfilePicturePreview(pictureUrl);
      }
    }
  }, [profile, profilePicture]);

  useEffect(() => {
    // Clean up blob URL when component unmounts or picture changes
    return () => {
      if (profilePicturePreview && profilePicturePreview.startsWith('blob:')) {
        URL.revokeObjectURL(profilePicturePreview);
      }
    };
  }, [profilePicturePreview]);

  const handlePictureChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Please select a valid image file');
      e.target.value = ''; // Reset input
      return;
    }
    
    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      showError('Image size should be less than 2MB');
      e.target.value = ''; // Reset input
      return;
    }

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setProfilePicturePreview(previewUrl);
    setProfilePicture(file);
    
    // Start upload immediately
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Create FormData with only the picture
      const formData = new FormData();
      formData.append('picture', file);
      
      // Create progress callback
      const progressCallback = (progress) => {
        setUploadProgress(progress);
      };
      
      // Upload picture immediately
      const updatedProfile = await dispatch(updateProfile({
        formData: formData,
        onUploadProgress: progressCallback
      })).unwrap();
      
      setIsUploading(false);
      setUploadProgress(0);
      
      if (updatedProfile) {
        // Update picture preview with server URL
        if (updatedProfile.picture_url || updatedProfile.picture) {
          let pictureUrl = updatedProfile.picture_url || (updatedProfile.picture ? getStorageUrl(updatedProfile.picture) : null);
          // Normalize URL to ensure it uses /load-storage/ instead of /storage/
          if (pictureUrl) {
            pictureUrl = normalizeStorageUrl(pictureUrl);
          }
          // Revoke the blob URL and set the server URL
          URL.revokeObjectURL(previewUrl);
          setProfilePicturePreview(pictureUrl);
        }
        
        // Update user in auth state
        const normalizedProfile = {
          ...updatedProfile,
          picture_url: updatedProfile.picture_url ? normalizeStorageUrl(updatedProfile.picture_url) : updatedProfile.picture_url,
        };
        
        const mergedUser = {
          ...currentUser,
          ...normalizedProfile,
          user_type: normalizedProfile.user_type || currentUser?.user_type,
          user_type_title: normalizedProfile.user_type_title || currentUser?.user_type_title,
          roles: normalizedProfile.roles || currentUser?.roles,
          is_admin: currentUser?.is_admin,
        };
        dispatch(setUser(mergedUser));
        
        // Refresh profile to get latest data
        await dispatch(fetchProfile());
        
        success('Profile picture updated successfully');
      }
      
      // Clear the file input and picture state
      setProfilePicture(null);
      e.target.value = ''; // Reset input
    } catch (err) {
      setIsUploading(false);
      setUploadProgress(0);
      // Revert preview to original if upload fails
      if (profile?.picture_url || profile?.picture) {
        let pictureUrl = profile.picture_url || (profile.picture ? getStorageUrl(profile.picture) : null);
        if (pictureUrl) {
          pictureUrl = normalizeStorageUrl(pictureUrl);
        }
        setProfilePicturePreview(pictureUrl);
      } else {
        setProfilePicturePreview(null);
      }
      URL.revokeObjectURL(previewUrl);
      setProfilePicture(null);
      e.target.value = ''; // Reset input
      showError(err || 'Failed to upload profile picture. Please try again.');
    }
  };

  const handleRemovePicture = () => {
    setProfilePicture(null);
    // Reset to original picture if exists
    if (profile?.picture_url || profile?.picture) {
      let pictureUrl = profile.picture_url || (profile.picture ? getStorageUrl(profile.picture) : null);
      // Normalize URL to ensure it uses /load-storage/ instead of /storage/
      if (pictureUrl) {
        pictureUrl = normalizeStorageUrl(pictureUrl);
      }
      setProfilePicturePreview(pictureUrl);
    } else {
      setProfilePicturePreview(null);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    try {
      isUpdatingRef.current = true;
      const updateData = { ...profileData };
      
      // Note: Picture is now uploaded immediately when selected, so we only update other fields here
      // If there's a new picture that wasn't uploaded yet (shouldn't happen with new flow, but keep for safety)
      if (profilePicture) {
        setIsUploading(true);
        setUploadProgress(0);
        
        const formData = new FormData();
        Object.keys(updateData).forEach(key => {
          if (updateData[key] !== null && updateData[key] !== undefined && updateData[key] !== '') {
            formData.append(key, updateData[key]);
          }
        });
        formData.append('picture', profilePicture);
        
        // Create progress callback
        const progressCallback = (progress) => {
          setUploadProgress(progress);
        };
        
        // Dispatch with FormData and progress callback
        const updatedProfile = await dispatch(updateProfile({
          formData: formData,
          onUploadProgress: progressCallback
        })).unwrap();
        
        setIsUploading(false);
        setUploadProgress(0);
        
        // Update profile data with response
        if (updatedProfile) {
          setProfileData({
            name: updatedProfile.name || '',
            first_name: updatedProfile.first_name || '',
            last_name: updatedProfile.last_name || '',
            email: updatedProfile.email || '',
            contact_no: updatedProfile.contact_no || '',
            emergency_contact_no: updatedProfile.emergency_contact_no || '',
            address: updatedProfile.address || '',
            country: updatedProfile.country || '',
            city: updatedProfile.city || '',
          });
          
          // Update picture preview with new URL
          if (updatedProfile.picture_url || updatedProfile.picture) {
            let pictureUrl = updatedProfile.picture_url || (updatedProfile.picture ? getStorageUrl(updatedProfile.picture) : null);
            // Normalize URL to ensure it uses /load-storage/ instead of /storage/
            if (pictureUrl) {
              pictureUrl = normalizeStorageUrl(pictureUrl);
            }
            setProfilePicturePreview(pictureUrl);
          }
        }
        
        setProfilePicture(null);
        success('Profile updated successfully');
        
        // Update user in auth state - merge with existing user data to preserve user_type_title and roles
        if (updatedProfile) {
          // Normalize picture_url if present - create new object to avoid mutating immutable object
          const normalizedProfile = {
            ...updatedProfile,
            picture_url: updatedProfile.picture_url ? normalizeStorageUrl(updatedProfile.picture_url) : updatedProfile.picture_url,
          };
          
          const mergedUser = {
            ...currentUser,
            ...normalizedProfile,
            // Preserve critical fields if not in updatedProfile
            user_type: normalizedProfile.user_type || currentUser?.user_type,
            user_type_title: normalizedProfile.user_type_title || currentUser?.user_type_title,
            roles: normalizedProfile.roles || currentUser?.roles,
            is_admin: currentUser?.is_admin, // Preserve is_admin flag
          };
          dispatch(setUser(mergedUser));
        }
        
        // Force profile refetch to ensure UI is in sync with latest data
        await dispatch(fetchProfile());
        isUpdatingRef.current = false;
      } else {
        const updatedProfile = await dispatch(updateProfile(updateData)).unwrap();
        
        // Update profile data with response
        if (updatedProfile) {
          setProfileData({
            name: updatedProfile.name || '',
            first_name: updatedProfile.first_name || '',
            last_name: updatedProfile.last_name || '',
            email: updatedProfile.email || '',
            contact_no: updatedProfile.contact_no || '',
            emergency_contact_no: updatedProfile.emergency_contact_no || '',
            address: updatedProfile.address || '',
            country: updatedProfile.country || '',
            city: updatedProfile.city || '',
          });
        }
        
        success('Profile updated successfully');
        // Update user in auth state - merge with existing user data to preserve user_type_title and roles
        if (updatedProfile) {
          // Normalize picture_url if present - create new object to avoid mutating immutable object
          const normalizedProfile = {
            ...updatedProfile,
            picture_url: updatedProfile.picture_url ? normalizeStorageUrl(updatedProfile.picture_url) : updatedProfile.picture_url,
          };
          
          const mergedUser = {
            ...currentUser,
            ...normalizedProfile,
            // Preserve critical fields if not in updatedProfile
            user_type: normalizedProfile.user_type || currentUser?.user_type,
            user_type_title: normalizedProfile.user_type_title || currentUser?.user_type_title,
            roles: normalizedProfile.roles || currentUser?.roles,
            is_admin: currentUser?.is_admin, // Preserve is_admin flag
          };
          dispatch(setUser(mergedUser));
        }
        
        // Force profile refetch to ensure UI is in sync with latest data
        await dispatch(fetchProfile());
        isUpdatingRef.current = false;
      }
    } catch (err) {
      isUpdatingRef.current = false;
      setIsUploading(false);
      setUploadProgress(0);
      const errorMessage = typeof err === 'string' ? err : err?.email?.[0] || err?.message || 'Failed to update profile';
      showError(errorMessage);
      console.error('Profile update error:', err);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.new_password !== passwordData.new_password_confirmation) {
      showError('New passwords do not match');
      return;
    }

    try {
      await dispatch(changePassword(passwordData)).unwrap();
      success('Password changed successfully');
      setPasswordData({
        current_password: '',
        new_password: '',
        new_password_confirmation: '',
      });
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : err?.current_password?.[0] || 'Failed to change password';
      showError(errorMessage);
    }
  };

  // Show error if profile fetch failed
  useEffect(() => {
    if (profileError) {
      showError(profileError);
    }
  }, [profileError, showError]);

  // Show loading only on initial load
  if (loading && !profile && !profileError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your profile information and account settings
        </p>
        {profileError && (
          <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
            Error loading profile: {profileError}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'profile'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Profile Information
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'password'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Change Password
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your personal information and contact details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              {/* Profile Picture Section */}
              <div className="flex flex-col items-center gap-4 pb-6 border-b border-border">
                <div className="relative">
                  {profilePicturePreview ? (
                    <div className="relative">
                      <img
                        src={profilePicturePreview}
                        alt="Profile"
                        className="w-32 h-32 rounded-full object-cover border-4 border-border transition-all duration-500 ease-out"
                        style={{
                          filter: isUploading 
                            ? `blur(${Math.max(0, 20 - (uploadProgress / 100) * 20)}px) brightness(${0.5 + (uploadProgress / 100) * 0.5})` 
                            : 'blur(0px) brightness(1)',
                          transform: isUploading 
                            ? `scale(${0.9 + (uploadProgress / 100) * 0.1})` 
                            : 'scale(1)',
                        }}
                      />
                      {isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-background/80 backdrop-blur-sm rounded-full p-2">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          </div>
                        </div>
                      )}
                      {!isUploading && (
                        <button
                          type="button"
                          onClick={handleRemovePicture}
                          className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center border-4 border-border">
                      <User className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="text-center space-y-2">
                  <Label htmlFor="picture" className={`cursor-pointer ${isUploading ? 'pointer-events-none opacity-50' : ''}`}>
                    <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      <span>{isUploading ? 'Uploading...' : (profilePicturePreview ? 'Change Picture' : 'Upload Picture')}</span>
                    </div>
                  </Label>
                  <Input
                    id="picture"
                    type="file"
                    accept="image/*"
                    onChange={handlePictureChange}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, GIF or WebP. Max size 2MB
                  </p>
                </div>
                {isUploading && (
                  <div className="w-full max-w-xs">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Uploading...</span>
                      <span className="font-medium">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={profileData.first_name}
                    onChange={(e) =>
                      setProfileData({ ...profileData, first_name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={profileData.last_name}
                    onChange={(e) =>
                      setProfileData({ ...profileData, last_name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="contact_no">Contact Number</Label>
                  <Input
                    id="contact_no"
                    value={profileData.contact_no}
                    onChange={(e) =>
                      setProfileData({ ...profileData, contact_no: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="emergency_contact_no">Emergency Contact</Label>
                  <Input
                    id="emergency_contact_no"
                    value={profileData.emergency_contact_no}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        emergency_contact_no: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={profileData.address}
                    onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={profileData.city}
                    onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={profileData.country}
                    onChange={(e) => setProfileData({ ...profileData, country: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <Label htmlFor="current_password">Current Password</Label>
                <Input
                  id="current_password"
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, current_password: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="new_password">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, new_password: e.target.value })
                  }
                  required
                  minLength={8}
                />
              </div>
              <div>
                <Label htmlFor="new_password_confirmation">Confirm New Password</Label>
                <Input
                  id="new_password_confirmation"
                  type="password"
                  value={passwordData.new_password_confirmation}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      new_password_confirmation: e.target.value,
                    })
                  }
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Changing...
                  </>
                ) : (
                  'Change Password'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Profile;

