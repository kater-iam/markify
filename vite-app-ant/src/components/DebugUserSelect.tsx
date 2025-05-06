import { Select, Typography } from 'antd';
import { useCallback } from 'react';

const { Text } = Typography;

interface User {
  email: string;
  password: string;
}

interface DebugUserSelectProps {
  onUserSelect: (user: User) => void;
}

const DEBUG_USERS: User[] = [
  { email: 'admin@kater.jp', password: 'password123' },
  { email: 'user01@kater.jp', password: 'password123' },
  { email: 'user02@kater.jp', password: 'password123' },
  { email: 'user03@kater.jp', password: 'password123' },
  { email: 'user04@kater.jp', password: 'password123' },
  { email: 'user05@kater.jp', password: 'password123' },
  { email: 'user06@kater.jp', password: 'password123' },
  { email: 'user07@kater.jp', password: 'password123' },
  { email: 'user08@kater.jp', password: 'password123' },
  { email: 'user09@kater.jp', password: 'password123' },
  { email: 'user10@kater.jp', password: 'password123' },
  { email: 'user11@kater.jp', password: 'password123' },
  { email: 'user12@kater.jp', password: 'password123' },
  { email: 'user13@kater.jp', password: 'password123' },
  { email: 'user14@kater.jp', password: 'password123' },
  { email: 'user15@kater.jp', password: 'password123' },
  { email: 'user16@kater.jp', password: 'password123' },
  { email: 'user17@kater.jp', password: 'password123' },
  { email: 'user18@kater.jp', password: 'password123' },
  { email: 'user19@kater.jp', password: 'password123' },
  { email: 'user20@kater.jp', password: 'password123' },
];

export const DebugUserSelect: React.FC<DebugUserSelectProps> = ({ onUserSelect }) => {
  const handleChange = useCallback((value: string) => {
    const selectedUser = DEBUG_USERS.find(user => user.email === value);
    if (selectedUser) {
      onUserSelect(selectedUser);
    }
  }, [onUserSelect]);

  if (import.meta.env.VITE_DEBUG !== 'true') {
    return null;
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <Text type="secondary">デバッグモードのため、ユーザー選択できるようにしています</Text>
      <Select
        style={{ width: '100%', marginTop: 8 }}
        placeholder="デバッグユーザーを選択"
        onChange={handleChange}
        options={DEBUG_USERS.map(user => ({
          value: user.email,
          label: user.email,
        }))}
      />
    </div>
  );
}; 